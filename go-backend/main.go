package main

import (
	"bytes"
	"compress/gzip"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/imroc/req/v3"
	"github.com/joho/godotenv"
)

const (
	AnilistUrl     = "https://graphql.anilist.co"
	MiruroPipeUrl  = "https://www.miruro.tv/api/secure/pipe"
	MediaListFields = `
    id
    title { romaji english native }
    coverImage { large extraLarge }
    bannerImage
    format
    season
    seasonYear
    episodes
    duration
    status
    averageScore
    meanScore
    popularity
    favourites
    genres
    source
    countryOfOrigin
    isAdult
    studios { edges { isMain node { name isAnimationStudio } } }
    nextAiringEpisode { episode airingAt timeUntilAiring }
    startDate { year month day }
    endDate { year month day }
    description(asHtml: false)
    tags { name isGeneralSpoiler isAdult}
    externalLinks { url site type }
    trailer { id site thumbnail }
`
	MediaFullFields = `
    id
    idMal
    title { romaji english native }
    description(asHtml: false)
    coverImage { large extraLarge color }
    bannerImage
    format
    season
    seasonYear
    episodes
    duration
    status
    averageScore
    meanScore
    popularity
    favourites
    trending
    genres
    tags { name rank isMediaSpoiler }
    source
    countryOfOrigin
    isAdult
    hashtag
    synonyms
    siteUrl
    trailer { id site thumbnail }
    studios { nodes { id name isAnimationStudio siteUrl } }
    nextAiringEpisode { episode airingAt timeUntilAiring }
    startDate { year month day }
    endDate { year month day }
    characters(sort: [ROLE, RELEVANCE], perPage: 25) {
        edges {
            role
            node { id name { full native } image { large } }
            voiceActors(language: JAPANESE) { id name { full native } image { large } languageV2 }
        }
    }
    staff(sort: RELEVANCE, perPage: 25) {
        edges {
            role
            node { id name { full native } image { large } }
        }
    }
    relations {
        edges {
            relationType(version: 2)
            node {
                id
                title { romaji english native }
                coverImage { large }
                format
                type
                status
                episodes
                meanScore
            }
        }
    }
    recommendations(sort: RATING_DESC, perPage: 10) {
        nodes {
            rating
            mediaRecommendation {
                id
                title { romaji english native }
                coverImage { large }
                format
                episodes
                status
                meanScore
                averageScore
            }
        }
    }
    externalLinks { url site type }
    streamingEpisodes { title thumbnail url site }
    stats {
        scoreDistribution { score amount }
        statusDistribution { status amount }
    }
`
)

var sortMap = map[string]string{
	"SCORE_DESC":      "SCORE_DESC",
	"POPULARITY_DESC": "POPULARITY_DESC",
	"TRENDING_DESC":   "TRENDING_DESC",
	"START_DATE_DESC": "START_DATE_DESC",
	"FAVOURITES_DESC": "FAVOURITES_DESC",
	"UPDATED_AT_DESC": "UPDATED_AT_DESC",
}

// req client global setup (TLS Impersonation for Cloudflare bypass)
var client = req.C().ImpersonateChrome().SetTimeout(15 * time.Second).SetCommonHeaders(map[string]string{
	"User-Agent":         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
	"Referer":            "https://www.miruro.tv/",
	"Origin":             "https://www.miruro.tv",
	"Accept":             "*/*",
	"Accept-Language":    "en-US,en;q=0.9",
	"sec-fetch-site":     "same-origin",
	"sec-fetch-mode":     "cors",
	"sec-fetch-dest":     "empty",
	"sec-ch-ua":          `"Chromium";v="110", "Not A(Brand";v="24", "Google Chrome";v="110"`,
	"sec-ch-ua-mobile":   "?0",
	"sec-ch-ua-platform": `"Windows"`,
})

func main() {
	_ = godotenv.Load()

	r := gin.Default()

	// CORS Middleware
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"*"},
		AllowHeaders:     []string{"*"},
		AllowCredentials: true,
	}))

	// Routes
	r.GET("/", home)
	r.GET("/search", searchAnime)
	r.GET("/suggestions", searchSuggestions)
	r.GET("/filter", filterAnime)
	r.GET("/spotlight", getSpotlight)
	r.GET("/trending", getTrending)
	r.GET("/popular", getPopular)
	r.GET("/upcoming", getUpcoming)
	r.GET("/recent", getRecent)
	r.GET("/schedule", getSchedule)
	r.GET("/info/:anilist_id", getAnimeInfo)
	r.GET("/anime/:anilist_id/characters", getAnimeCharacters)
	r.GET("/anime/:anilist_id/relations", getAnimeRelations)
	r.GET("/anime/:anilist_id/recommendations", getAnimeRecommendations)
	r.GET("/episodes/:anilist_id", getEpisodesRoute)
	r.GET("/sources", getSourcesRoute)
	r.GET("/watch/:provider/:anilist_id/:category/:slug", getWatchSources)

	log.Println("Server running on http://localhost:9189")
	if err := r.Run("0.0.0.0:9189"); err != nil {
		log.Fatal(err)
	}
}

// --- Helpers ---

func getQueryInt(c *gin.Context, key string, defaultVal int) int {
	val := c.Query(key)
	if val == "" {
		return defaultVal
	}
	parsed, err := strconv.Atoi(val)
	if err != nil {
		return defaultVal
	}
	return parsed
}

func translateID(encodedID string) string {
	decoded, err := base64.RawURLEncoding.DecodeString(strings.TrimRight(encodedID, "="))
	if err == nil && strings.Contains(string(decoded), ":") {
		return string(decoded)
	}
	return encodedID
}

func deepTranslate(obj any) {
	switch v := obj.(type) {
	case map[string]any:
		for key, val := range v {
			if key == "id" {
				if strVal, ok := val.(string); ok {
					v[key] = translateID(strVal)
				}
			} else {
				deepTranslate(val)
			}
		}
	case []any:
		for _, item := range v {
			deepTranslate(item)
		}
	}
}

func decodePipeResponse(encodedStr string) (map[string]any, error) {
	compressed, err := base64.RawURLEncoding.DecodeString(strings.TrimRight(encodedStr, "="))
	if err != nil {
		return nil, fmt.Errorf("base64 decode error: %w", err)
	}
	r, err := gzip.NewReader(bytes.NewReader(compressed))
	if err != nil {
		return nil, fmt.Errorf("gzip reader error: %w", err)
	}
	defer r.Close()
	decompressed, err := io.ReadAll(r)
	if err != nil {
		return nil, fmt.Errorf("gzip read error: %w", err)
	}
	var data map[string]any
	if err := json.Unmarshal(decompressed, &data); err != nil {
		return nil, fmt.Errorf("json unmarshal error: %w", err)
	}
	return data, nil
}

func encodePipeRequest(payload map[string]any) string {
	b, _ := json.Marshal(payload)
	return strings.TrimRight(base64.URLEncoding.EncodeToString(b), "=")
}

func injectSourceSlugs(data map[string]any, anilistID int) map[string]any {
	providersRaw, ok := data["providers"]
	if !ok {
		return data
	}
	providers, ok := providersRaw.(map[string]any)
	if !ok {
		return data
	}

	for providerName, providerDataRaw := range providers {
		providerData, ok := providerDataRaw.(map[string]any)
		if !ok {
			continue
		}
		episodesRaw, ok := providerData["episodes"]
		if !ok {
			continue
		}

		var episodes map[string]any
		if epMap, ok := episodesRaw.(map[string]any); ok {
			episodes = epMap
		} else if epList, ok := episodesRaw.([]any); ok {
			episodes = map[string]any{"sub": epList}
			providerData["episodes"] = episodes
		} else {
			continue
		}

		for category, epListRaw := range episodes {
			epList, ok := epListRaw.([]any)
			if !ok {
				continue
			}
			for _, epRaw := range epList {
				ep, ok := epRaw.(map[string]any)
				if !ok {
					continue
				}
				idRaw, hasID := ep["id"]
				numRaw, hasNum := ep["number"]
				if hasID && hasNum {
					origID := fmt.Sprintf("%v", idRaw)
					num := fmt.Sprintf("%v", numRaw)
					prefix := origID
					if parts := strings.SplitN(origID, ":", 2); len(parts) > 0 {
						prefix = parts[0]
					}
					ep["id"] = fmt.Sprintf("watch/%s/%d/%s/%s-%s", providerName, anilistID, category, prefix, num)
				}
			}
		}
	}
	return data
}

func anilistQuery(query string, variables map[string]any) (map[string]any, error) {
	body := map[string]any{"query": query}
	if variables != nil {
		body["variables"] = variables
	}
	resp, err := req.C().R().SetBody(body).Post(AnilistUrl)
	if err != nil {
		return nil, err
	}
	if !resp.IsSuccessState() {
		return nil, fmt.Errorf("Anilist query failed with status %d", resp.GetStatusCode())
	}
	var result struct {
		Data map[string]any `json:"data"`
	}
	if err := resp.UnmarshalJson(&result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

func fetchRawEpisodes(anilistID int) (map[string]any, error) {
	payload := map[string]any{
		"path":    "episodes",
		"method":  "GET",
		"query":   map[string]any{"anilistId": anilistID},
		"body":    nil,
		"version": "0.1.0",
	}
	encodedReq := encodePipeRequest(payload)
	url := fmt.Sprintf("%s?e=%s", MiruroPipeUrl, encodedReq)
	resp, err := client.R().Get(url)
	if err != nil {
		return nil, err
	}
	if !resp.IsSuccessState() {
		return nil, fmt.Errorf("pipe response %d: %s", resp.GetStatusCode(), resp.String())
	}
	data, err := decodePipeResponse(strings.TrimSpace(resp.String()))
	if err != nil {
		return nil, err
	}
	deepTranslate(data)
	return data, nil
}

func fetchCollection(sortType string, status string, page int, perPage int) (map[string]any, error) {
	statusFilter := ""
	if status != "" {
		statusFilter = fmt.Sprintf(", status: %s", status)
	}
	gql := fmt.Sprintf(`
    query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
            pageInfo { total currentPage lastPage hasNextPage perPage }
            media(type: ANIME, sort: [%s]%s) {
                %s
            }
        }
    }
    `, sortType, statusFilter, MediaListFields)

	data, err := anilistQuery(gql, map[string]any{"page": page, "perPage": perPage})
	if err != nil {
		return nil, err
	}
	pageData, _ := data["Page"].(map[string]any)
	pageInfo, _ := pageData["pageInfo"].(map[string]any)

	return map[string]any{
		"page":        getMapInt(pageInfo, "currentPage", page),
		"perPage":     getMapInt(pageInfo, "perPage", perPage),
		"total":       getMapInt(pageInfo, "total", 0),
		"hasNextPage": getMapBool(pageInfo, "hasNextPage"),
		"results":     pageData["media"],
	}, nil
}

// Safely extracts typed values from untyped maps
func getMapInt(m map[string]any, key string, def int) int {
	if m == nil {
		return def
	}
	if v, ok := m[key].(float64); ok {
		return int(v)
	}
	return def
}

func getMapBool(m map[string]any, key string) bool {
	if m == nil {
		return false
	}
	if v, ok := m[key].(bool); ok {
		return v
	}
	return false
}

// --- Handlers ---

func home(c *gin.Context) {
	// (Note: The JS string interpolation has been replaced with concat to prevent backtick clash in Go)
	htmlContent := `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Miruro API v3.0</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#03040a;--surface:rgba(255,255,255,0.03);--border:rgba(255,255,255,0.07);
  --blue:#38bdf8;--purple:#818cf8;--green:#34d399;--amber:#fbbf24;
  --text:#e2e8f0;--muted:#64748b;--dim:#334155;
  --font:'Inter',sans-serif;--mono:'JetBrains Mono',monospace;
}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);font-family:var(--font);min-height:100vh;overflow-x:hidden;-webkit-font-smoothing:antialiased}
#bg{position:fixed;inset:0;z-index:0;pointer-events:none}
.notice{position:relative;z-index:10;background:linear-gradient(90deg,rgba(251,191,36,.12),rgba(251,191,36,.06));border-bottom:1px solid rgba(251,191,36,.2);padding:11px 20px;text-align:center;font-size:.82em;color:#fde68a;display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap}
.notice strong{color:#fbbf24}
.notice-icon{font-size:1em;flex-shrink:0}
.wrap{position:relative;z-index:1;max-width:860px;margin:0 auto;padding:60px 20px 80px}
.hero{text-align:center;padding:50px 0 60px;perspective:1000px}
.logo-wrap{display:inline-block;margin-bottom:28px;animation:float 6s ease-in-out infinite}
.logo-wrap img{width:88px;border-radius:22px;box-shadow:0 0 0 1px var(--border),0 20px 60px rgba(56,189,248,.2);display:block}
@keyframes float{0%,100%{transform:translateY(0) rotateY(0deg)}50%{transform:translateY(-8px) rotateY(6deg)}}
h1{font-size:clamp(2rem,6vw,3.2rem);font-weight:700;letter-spacing:-.03em;line-height:1.1;margin-bottom:14px}
.grad{background:linear-gradient(135deg,#fff 0%,var(--blue) 50%,var(--purple) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.sub{color:var(--muted);font-size:1em;font-weight:400;max-width:480px;margin:0 auto 20px;line-height:1.6}
.chip{display:inline-flex;align-items:center;gap:6px;background:rgba(56,189,248,.08);color:var(--blue);border:1px solid rgba(56,189,248,.18);border-radius:999px;padding:5px 14px;font-size:.78em;font-weight:500;letter-spacing:.04em}
.chip::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}
.section{margin-top:56px}
.section-head{display:flex;align-items:center;gap:10px;margin-bottom:20px}
.section-head h2{font-size:.7em;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.section-line{flex:1;height:1px;background:var(--border)}
.card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:22px 24px;margin-bottom:10px;cursor:default;will-change:transform;transition:transform .2s cubic-bezier(.23,1,.32,1),box-shadow .2s cubic-bezier(.23,1,.32,1),border-color .2s;transform-style:preserve-3d}
.card:hover{transform:translateY(-3px) scale(1.005);box-shadow:0 20px 60px rgba(0,0,0,.5),0 0 0 1px rgba(56,189,248,.12);border-color:rgba(56,189,248,.18)}
.card-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.method{font-family:var(--mono);font-size:.72em;font-weight:500;background:rgba(52,211,153,.1);color:var(--green);border:1px solid rgba(52,211,153,.2);padding:3px 9px;border-radius:6px;letter-spacing:.04em}
.path{font-family:var(--mono);font-size:.92em;color:var(--text);font-weight:500}
.badge{font-size:.65em;padding:2px 7px;border-radius:5px;font-weight:600;letter-spacing:.05em}
.b-new{background:rgba(52,211,153,.12);color:var(--green);border:1px solid rgba(52,211,153,.25)}
.b-hot{background:rgba(251,191,36,.1);color:var(--amber);border:1px solid rgba(251,191,36,.2)}
.b-rec{background:rgba(129,140,248,.12);color:var(--purple);border:1px solid rgba(129,140,248,.25)}
.desc{color:var(--muted);font-size:.87em;line-height:1.65;margin-top:12px}
.desc b{color:var(--text);font-weight:500}
.params{font-family:var(--mono);font-size:.78em;color:var(--dim);margin-top:10px;line-height:1.9}
.params em{color:var(--blue);font-style:normal}
.try{display:inline-flex;align-items:center;gap:5px;margin-top:12px;font-size:.8em;color:var(--blue);text-decoration:none;border:1px solid rgba(56,189,248,.15);border-radius:7px;padding:4px 10px;transition:background .15s,border-color .15s}
.try:hover{background:rgba(56,189,248,.08);border-color:rgba(56,189,248,.3)}
.try::after{content:'↗';font-size:.9em}
.returns{font-size:.8em;color:var(--dim);margin-top:10px;line-height:1.7}
.returns b{color:#a5b4fc;font-weight:500}
.step-card{border-radius:14px;padding:22px 24px;margin-bottom:10px;border:1px solid var(--border);will-change:transform;transition:transform .2s cubic-bezier(.23,1,.32,1),box-shadow .2s}
.step-card:hover{transform:translateY(-3px);box-shadow:0 20px 60px rgba(0,0,0,.5)}
.step1{background:linear-gradient(135deg,rgba(56,189,248,.05),rgba(56,189,248,.02))}
.step2{background:linear-gradient(135deg,rgba(52,211,153,.05),rgba(52,211,153,.02));border-color:rgba(52,211,153,.15)}
.step3{background:linear-gradient(135deg,rgba(129,140,248,.05),rgba(129,140,248,.02));border-color:rgba(129,140,248,.15)}
.step-num{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;font-size:.78em;font-weight:700;margin-right:8px;flex-shrink:0}
.s1{background:rgba(56,189,248,.12);color:var(--blue);border:1px solid rgba(56,189,248,.25)}
.s2{background:rgba(52,211,153,.12);color:var(--green);border:1px solid rgba(52,211,153,.25)}
.s3{background:rgba(129,140,248,.12);color:var(--purple);border:1px solid rgba(129,140,248,.25)}
pre{background:rgba(0,0,0,.4);border:1px solid var(--border);border-radius:10px;padding:16px;font-family:var(--mono);font-size:.76em;color:#94a3b8;overflow-x:auto;margin-top:14px;line-height:1.7;tab-size:2}
code{font-family:var(--mono);font-size:.85em;color:#a5b4fc;background:rgba(165,180,252,.07);padding:1px 5px;border-radius:4px}
.ptable{width:100%;margin-top:14px;border-collapse:collapse;font-size:.8em}
.ptable th{text-align:left;color:var(--purple);font-weight:500;padding:7px 10px;border-bottom:1px solid var(--border);font-size:.9em}
.ptable td{padding:7px 10px;color:var(--muted);border-bottom:1px solid rgba(255,255,255,.025)}
.ptable td:first-child{font-family:var(--mono);color:#a5b4fc;white-space:nowrap}
.alert{border-radius:10px;padding:13px 16px;font-size:.83em;line-height:1.6;margin-top:14px}
.alert-yellow{background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.15);color:#fde68a}
.alert-yellow b{color:var(--amber)}
.alert-green{background:rgba(52,211,153,.06);border:1px solid rgba(52,211,153,.15);color:#6ee7b7}
.alert-green b{color:var(--green)}
.footer{text-align:center;margin-top:72px;padding-top:28px;border-top:1px solid var(--border);color:var(--dim);font-size:.82em;line-height:2}
.footer a{color:var(--blue);text-decoration:none;font-weight:500}
.footer a:hover{color:var(--purple)}
@media(max-width:600px){
  .wrap{padding:40px 14px 60px}
  .hero{padding:36px 0 44px}
  .card,.step-card{padding:18px}
  pre{font-size:.7em}
}
</style>
</head>
<body>
<canvas id="bg"></canvas>
<div class="notice">
  <span class="notice-icon">⚠️</span>
  <span><strong>Hosting Notice:</strong> Miruro now has Cloudflare protection on the pipe endpoint. <strong>Do not deploy on Vercel</strong> — its IPs are datacenter-blocked by CF. Use a <strong>VPS with a residential or non-datacenter IP</strong> instead.</span>
</div>
<div class="wrap">
  <div class="hero">
    <div class="logo-wrap">
      <img src="https://www.miruro.to/assets/logo-Dnw3w3dS.png?v=1.12.0" alt="Miruro">
    </div>
    <h1><span class="grad">Miruro API</span></h1>
    <p class="sub">Reverse-engineered anime streaming API. Episodes, sources, metadata — all in one place.</p>
    <div class="chip">v3.0 &nbsp;·&nbsp; Live</div>
  </div>
  <div class="section">
    <div class="section-head"><h2>Search &amp; Discovery</h2><div class="section-line"></div></div>
    <div class="card">
      <div class="card-top"><span class="method">GET</span><span class="path">/search</span></div>
      <p class="desc">Search anime by name. Returns full metadata — title, cover, banner, genres, studios, scores, airing status, and more.</p>
      <div class="params">Params: <em>query</em> (required) &nbsp;·&nbsp; <em>page</em>=1 &nbsp;·&nbsp; <em>per_page</em>=20</div>
      <div class="returns">Returns: <b>page</b>, <b>perPage</b>, <b>total</b>, <b>hasNextPage</b>, <b>results[]</b> (20+ fields each)</div>
      <a class="try" href="/search?query=naruto&page=1&per_page=5" target="_blank">Try it</a>
    </div>
  </div>
  <div class="footer">
    All collection endpoints return <code>{ page, perPage, total, hasNextPage, results[] }</code>
    <br>
    Built by Walter &nbsp;·&nbsp; <a href="https://github.com/walterwhite-69" target="_blank">github.com/walterwhite-69</a>
  </div>
</div>
<script>
(function(){
  const c=document.getElementById('bg'),x=c.getContext('2d');
  let W,H,pts=[];
  const N=60,COLOR='rgba(56,189,248,';
  function resize(){W=c.width=innerWidth;H=c.height=innerHeight;pts=Array.from({length:N},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,r:Math.random()*1.5+.5}))}
  function draw(){
    x.clearRect(0,0,W,H);
    for(let i=0;i<N;i++){
      const p=pts[i];
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0||p.x>W)p.vx*=-1;
      if(p.y<0||p.y>H)p.vy*=-1;
      x.beginPath();x.arc(p.x,p.y,p.r,0,6.28);x.fillStyle=COLOR+'.4)';x.fill();
      for(let j=i+1;j<N;j++){
        const q=pts[j],dx=p.x-q.x,dy=p.y-q.y,d=Math.sqrt(dx*dx+dy*dy);
        if(d<140){x.beginPath();x.moveTo(p.x,p.y);x.lineTo(q.x,q.y);x.strokeStyle=COLOR+(1-d/140)*.08+')';x.lineWidth=.6;x.stroke()}
      }
    }
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize',resize);resize();draw();

  document.querySelectorAll('.card,.step-card').forEach(el=>{
    el.addEventListener('mousemove',e=>{
      const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
      const rx=((e.clientY-cy)/r.height)*6,ry=-((e.clientX-cx)/r.width)*6;
      el.style.transform="perspective(800px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) translateY(-3px)";
    });
    el.addEventListener('mouseleave',()=>el.style.transform='');
  });
})();
</script>
</body>
</html>`
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(htmlContent))
}

func searchAnime(c *gin.Context) {
	query := c.Query("query")
	page := getQueryInt(c, "page", 1)
	perPage := getQueryInt(c, "per_page", 20)

	gql := fmt.Sprintf(`
    query ($search: String, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
            pageInfo { total currentPage lastPage hasNextPage perPage }
            media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
                %s
            }
        }
    }
    `, MediaListFields)

	data, err := anilistQuery(gql, map[string]any{"search": query, "page": page, "perPage": perPage})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	pageData, _ := data["Page"].(map[string]any)
	pageInfo, _ := pageData["pageInfo"].(map[string]any)

	c.JSON(http.StatusOK, gin.H{
		"page":        getMapInt(pageInfo, "currentPage", page),
		"perPage":     getMapInt(pageInfo, "perPage", perPage),
		"total":       getMapInt(pageInfo, "total", 0),
		"hasNextPage": getMapBool(pageInfo, "hasNextPage"),
		"results":     pageData["media"],
	})
}

func searchSuggestions(c *gin.Context) {
	query := c.Query("query")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter required"})
		return
	}
	gql := `
    query ($search: String) {
        Page(page: 1, perPage: 8) {
            media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
                id
                title { romaji english }
                coverImage { large }
                format
                status
                startDate { year }
                episodes
            }
        }
    }`

	data, err := anilistQuery(gql, map[string]any{"search": query})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	media, _ := data["Page"].(map[string]any)["media"].([]any)
	var results []map[string]any

	for _, itemRaw := range media {
		item := itemRaw.(map[string]any)
		titleMap := item["title"].(map[string]any)
		
		title := titleMap["english"]
		if title == nil {
			title = titleMap["romaji"]
		}

		year := (*new(int))
		if sd, ok := item["startDate"].(map[string]any); ok && sd["year"] != nil {
			year = int(sd["year"].(float64))
		}

		res := map[string]any{
			"id":           item["id"],
			"title":        title,
			"title_romaji": titleMap["romaji"],
			"poster":       item["coverImage"].(map[string]any)["large"],
			"format":       item["format"],
			"status":       item["status"],
			"year":         year,
			"episodes":     item["episodes"],
		}
		results = append(results, res)
	}
	c.JSON(http.StatusOK, gin.H{"suggestions": results})
}

func filterAnime(c *gin.Context) {
	genre := c.Query("genre")
	tag := c.Query("tag")
	year := c.Query("year")
	season := strings.ToUpper(c.Query("season"))
	format := strings.ToUpper(c.Query("format"))
	status := strings.ToUpper(c.Query("status"))
	sort := c.Query("sort")
	if sort == "" {
		sort = "POPULARITY_DESC"
	}
	
	page := getQueryInt(c, "page", 1)
	perPage := getQueryInt(c, "per_page", 20)

	args := []string{"type: ANIME", fmt.Sprintf("sort: [%s]", sortMap[sort])}
	variables := map[string]any{"page": page, "perPage": perPage}
	varTypes := []string{"$page: Int", "$perPage: Int"}

	if genre != "" {
		args = append(args, "genre: $genre")
		variables["genre"] = genre
		varTypes = append(varTypes, "$genre: String")
	}
	if tag != "" {
		args = append(args, "tag: $tag")
		variables["tag"] = tag
		varTypes = append(varTypes, "$tag: String")
	}
	if year != "" {
		args = append(args, "seasonYear: $seasonYear")
		yInt, _ := strconv.Atoi(year)
		variables["seasonYear"] = yInt
		varTypes = append(varTypes, "$seasonYear: Int")
	}
	if season != "" {
		args = append(args, "season: $season")
		variables["season"] = season
		varTypes = append(varTypes, "$season: MediaSeason")
	}
	if format != "" {
		args = append(args, "format: $format")
		variables["format"] = format
		varTypes = append(varTypes, "$format: MediaFormat")
	}
	if status != "" {
		args = append(args, "status: $status")
		variables["status"] = status
		varTypes = append(varTypes, "$status: MediaStatus")
	}

	gql := fmt.Sprintf(`
    query (%s) {
        Page(page: $page, perPage: $perPage) {
            pageInfo { total currentPage lastPage hasNextPage perPage }
            media(%s) {
                %s
            }
        }
    }`, strings.Join(varTypes, ", "), strings.Join(args, ", "), MediaListFields)

	data, err := anilistQuery(gql, variables)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	pageData, _ := data["Page"].(map[string]any)
	pageInfo, _ := pageData["pageInfo"].(map[string]any)

	c.JSON(http.StatusOK, gin.H{
		"page":        getMapInt(pageInfo, "currentPage", page),
		"perPage":     getMapInt(pageInfo, "perPage", perPage),
		"total":       getMapInt(pageInfo, "total", 0),
		"hasNextPage": getMapBool(pageInfo, "hasNextPage"),
		"results":     pageData["media"],
	})
}

func getSpotlight(c *gin.Context) {
	gql := fmt.Sprintf(`
    query {
        Page(page: 1, perPage: 10) {
            media(sort: [TRENDING_DESC, POPULARITY_DESC], type: ANIME) {
                %s
            }
        }
    }`, MediaListFields)

	data, err := anilistQuery(gql, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	media := data["Page"].(map[string]any)["media"]
	c.JSON(http.StatusOK, gin.H{"results": media})
}

func getTrending(c *gin.Context) {
	data, err := fetchCollection("TRENDING_DESC", "", getQueryInt(c, "page", 1), getQueryInt(c, "per_page", 20))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func getPopular(c *gin.Context) {
	data, err := fetchCollection("POPULARITY_DESC", "", getQueryInt(c, "page", 1), getQueryInt(c, "per_page", 20))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func getUpcoming(c *gin.Context) {
	data, err := fetchCollection("POPULARITY_DESC", "NOT_YET_RELEASED", getQueryInt(c, "page", 1), getQueryInt(c, "per_page", 20))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func getRecent(c *gin.Context) {
	data, err := fetchCollection("START_DATE_DESC", "RELEASING", getQueryInt(c, "page", 1), getQueryInt(c, "per_page", 20))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func getSchedule(c *gin.Context) {
	page := getQueryInt(c, "page", 1)
	perPage := getQueryInt(c, "per_page", 20)

	gql := fmt.Sprintf(`
    query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
            pageInfo { total currentPage lastPage hasNextPage perPage }
            airingSchedules(notYetAired: true, sort: TIME) {
                episode
                airingAt
                timeUntilAiring
                media {
                    %s
                }
            }
        }
    }`, MediaListFields)

	data, err := anilistQuery(gql, map[string]any{"page": page, "perPage": perPage})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	pageData := data["Page"].(map[string]any)
	pageInfo := pageData["pageInfo"].(map[string]any)
	schedules := pageData["airingSchedules"].([]any)
	var results []map[string]any

	for _, sRaw := range schedules {
		item := sRaw.(map[string]any)
		entry := item["media"].(map[string]any)
		entry["next_episode"] = item["episode"]
		entry["airingAt"] = item["airingAt"]
		entry["timeUntilAiring"] = item["timeUntilAiring"]
		results = append(results, entry)
	}

	c.JSON(http.StatusOK, gin.H{
		"page":        getMapInt(pageInfo, "currentPage", page),
		"perPage":     getMapInt(pageInfo, "perPage", perPage),
		"total":       getMapInt(pageInfo, "total", 0),
		"hasNextPage": getMapBool(pageInfo, "hasNextPage"),
		"results":     results,
	})
}

func getAnimeInfo(c *gin.Context) {
	anilistID, err := strconv.Atoi(c.Param("anilist_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	gql := fmt.Sprintf(`
    query ($id: Int) {
        Media(id: $id, type: ANIME) {
            %s
        }
    }`, MediaFullFields)

	data, err := anilistQuery(gql, map[string]any{"id": anilistID})
	if err != nil || data["Media"] == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Anime not found"})
		return
	}
	c.JSON(http.StatusOK, data["Media"])
}

func getAnimeCharacters(c *gin.Context) {
	anilistID, _ := strconv.Atoi(c.Param("anilist_id"))
	page := getQueryInt(c, "page", 1)
	perPage := getQueryInt(c, "per_page", 25)

	gql := `
    query ($id: Int, $page: Int, $perPage: Int) {
        Media(id: $id, type: ANIME) {
            id
            title { romaji english }
            characters(sort: [ROLE, RELEVANCE], page: $page, perPage: $perPage) {
                pageInfo { total currentPage lastPage hasNextPage perPage }
                edges {
                    role
                    node {
                        id
                        name { full native userPreferred }
                        image { large medium }
                        description
                        gender
                        dateOfBirth { year month day }
                        age
                        favourites
                        siteUrl
                    }
                    voiceActors {
                        id
                        name { full native }
                        image { large }
                        languageV2
                    }
                }
            }
        }
    }`

	data, err := anilistQuery(gql, map[string]any{"id": anilistID, "page": page, "perPage": perPage})
	if err != nil || data["Media"] == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Anime not found"})
		return
	}

	media := data["Media"].(map[string]any)
	chars := media["characters"].(map[string]any)
	pageInfo := chars["pageInfo"].(map[string]any)

	c.JSON(http.StatusOK, gin.H{
		"page":        getMapInt(pageInfo, "currentPage", page),
		"perPage":     getMapInt(pageInfo, "perPage", perPage),
		"total":       getMapInt(pageInfo, "total", 0),
		"hasNextPage": getMapBool(pageInfo, "hasNextPage"),
		"characters":  chars["edges"],
	})
}

func getAnimeRelations(c *gin.Context) {
	anilistID, _ := strconv.Atoi(c.Param("anilist_id"))

	gql := `
    query ($id: Int) {
        Media(id: $id, type: ANIME) {
            id
            title { romaji english }
            relations {
                edges {
                    relationType(version: 2)
                    node {
                        id
                        title { romaji english native }
                        coverImage { large }
                        bannerImage
                        format
                        type
                        status
                        episodes
                        chapters
                        meanScore
                        averageScore
                        popularity
                        startDate { year month day }
                    }
                }
            }
        }
    }`

	data, err := anilistQuery(gql, map[string]any{"id": anilistID})
	if err != nil || data["Media"] == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Anime not found"})
		return
	}

	media := data["Media"].(map[string]any)
	c.JSON(http.StatusOK, gin.H{
		"id":        media["id"],
		"title":     media["title"],
		"relations": media["relations"].(map[string]any)["edges"],
	})
}

func getAnimeRecommendations(c *gin.Context) {
	anilistID, _ := strconv.Atoi(c.Param("anilist_id"))
	page := getQueryInt(c, "page", 1)
	perPage := getQueryInt(c, "per_page", 10)

	gql := `
    query ($id: Int, $page: Int, $perPage: Int) {
        Media(id: $id, type: ANIME) {
            id
            title { romaji english }
            recommendations(sort: RATING_DESC, page: $page, perPage: $perPage) {
                pageInfo { total currentPage lastPage hasNextPage perPage }
                nodes {
                    rating
                    mediaRecommendation {
                        id
                        title { romaji english native }
                        coverImage { large extraLarge }
                        bannerImage
                        format
                        episodes
                        status
                        meanScore
                        averageScore
                        popularity
                        genres
                        startDate { year }
                    }
                }
            }
        }
    }`

	data, err := anilistQuery(gql, map[string]any{"id": anilistID, "page": page, "perPage": perPage})
	if err != nil || data["Media"] == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Anime not found"})
		return
	}

	media := data["Media"].(map[string]any)
	recs := media["recommendations"].(map[string]any)
	pageInfo := recs["pageInfo"].(map[string]any)

	c.JSON(http.StatusOK, gin.H{
		"page":            getMapInt(pageInfo, "currentPage", page),
		"perPage":         getMapInt(pageInfo, "perPage", perPage),
		"total":           getMapInt(pageInfo, "total", 0),
		"hasNextPage":     getMapBool(pageInfo, "hasNextPage"),
		"recommendations": recs["nodes"],
	})
}

func getEpisodesRoute(c *gin.Context) {
	anilistID, err := strconv.Atoi(c.Param("anilist_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}
	data, err := fetchRawEpisodes(anilistID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, injectSourceSlugs(data, anilistID))
}

func getSourcesRoute(c *gin.Context) {
	episodeID := c.Query("episodeId")
	provider := c.Query("provider")
	anilistID, _ := strconv.Atoi(c.Query("anilistId"))
	category := c.Query("category")
	if category == "" {
		category = "sub"
	}

	encID := strings.TrimRight(base64.URLEncoding.EncodeToString([]byte(episodeID)), "=")
	payload := map[string]any{
		"path":   "sources",
		"method": "GET",
		"query": map[string]any{
			"episodeId": encID,
			"provider":  provider,
			"category":  category,
			"anilistId": anilistID,
		},
		"body":    nil,
		"version": "0.1.0",
	}

	encodedReq := encodePipeRequest(payload)
	url := fmt.Sprintf("%s?e=%s", MiruroPipeUrl, encodedReq)
	
	resp, err := client.R().Get(url)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !resp.IsSuccessState() {
		c.JSON(resp.GetStatusCode(), gin.H{"error": "pipe request failed", "body": resp.String()})
		return
	}

	data, err := decodePipeResponse(strings.TrimSpace(resp.String()))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func getWatchSources(c *gin.Context) {
	provider := c.Param("provider")
	anilistID, _ := strconv.Atoi(c.Param("anilist_id"))
	category := c.Param("category")
	slug := c.Param("slug")

	data, err := fetchRawEpisodes(anilistID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	provData, ok := data["providers"].(map[string]any)[provider].(map[string]any)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "Provider not found"})
		return
	}

	epList, ok := provData["episodes"].(map[string]any)[category].([]any)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}

	var targetID string
	for _, epRaw := range epList {
		ep := epRaw.(map[string]any)
		origID := fmt.Sprintf("%v", ep["id"])
		prefix := origID
		if parts := strings.SplitN(origID, ":", 2); len(parts) > 0 {
			prefix = parts[0]
		}
		generated := fmt.Sprintf("%s-%v", prefix, ep["number"])
		if generated == slug {
			targetID = origID
			break
		}
	}

	if targetID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("Episode slug '%s' not found for provider %s", slug, provider)})
		return
	}

	// Redirect internally to getSources logic
	c.Request.URL.RawQuery = fmt.Sprintf("episodeId=%s&provider=%s&anilistId=%d&category=%s", targetID, provider, anilistID, category)
	getSourcesRoute(c)
}
