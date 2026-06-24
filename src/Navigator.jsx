import style from './Navigator.module.css';
import { House, Settings, BookOpen, Download, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect, useContext, useRef } from 'react';
import { AppContext } from './App.jsx';

const parentVariant = {
  hidden: {
    y: '100%'
  },
  visible: {
    y: 0,
    transition: {
      duration: 0.15,
      delayChildren: 0.1,
      staggerChildren: 0.25
    }
  }
};

const childVariant = {
  hidden: {
    y: '200%'
  },
  visible: {
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15
    }
  }
};

const iconVariant = {
  normal: {
    scale: 1,
    opacity: 1
  },
  resize: {
    scale: 0.9,
    opacity: 0.7,
    transition: {
      delay: 2,
      duration: 1
    }
  }
};

const labelVariants = {
  hidden: {
    height: 0
  },
  show: {
    height: 'auto',
    transition: {
      delay: 2,
      duration: 1
    }
  }
};

function Navigator() {
  const { page, setPage, setViewerOpen } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState(page);
  const [introFinished, setIntroFinished] = useState(false);

  const closeViewer = page => {
    if (location.hash.includes('viewer')) {
      history.replaceState(null, "", `#${page}`);
      dispatchEvent(new Event("hashchange"))
    } else {
      setViewerOpen(false);
      setPage(page);
    }
  };

  useEffect(() => {
    const introTimeout = setTimeout(() => {
      setIntroFinished(true);
    }, 3000);
    return () => {
      clearTimeout(introTimeout);
    };
  }, []);

  useEffect(() => {
    setActiveTab(page);
  }, [page]);

  return (
    <motion.section
      variants={parentVariant}
      initial='hidden'
      animate='visible'
      className={style.navigationSection}
    >
      <motion.div
        variants={childVariant}
        className={`${style.home} ${introFinished && activeTab === 'home' ? style.active : ''}`}
        onClick={() => {
          closeViewer('home');
        }}
      >
        <motion.div variants={iconVariant} initial='normal' animate='resize'>
          <House />
        </motion.div>
        <motion.span variants={labelVariants} initial='hidden' animate='show'>
          Home
        </motion.span>
        {activeTab === 'home' && (
          <motion.div
            initial={{
              x: introFinished ? 0 : '-100%',
              opacity: introFinished ? 1 : 0
            }}
            animate={{
              x: introFinished ? 0 : '-100%',
              opacity: introFinished ? 1 : 0,
              transition: {
                type: 'spring',
                stiffness: 300,
                damping: 20
              }
            }}
            layoutId='underline'
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`${style.underline} ${!introFinished ? style.intro : ''}`}
          />
        )}
      </motion.div>

      <motion.div
        variants={childVariant}
        className={`${style.search} ${introFinished && activeTab === 'search' ? style.active : ''}`}
        onClick={() => {
          closeViewer('search');
        }}
      >
        <motion.div variants={iconVariant} initial='normal' animate='resize'>
          <Search />
        </motion.div>
        <motion.span variants={labelVariants} initial='hidden' animate='show'>
          Search
        </motion.span>
        {activeTab === 'search' && (
          <motion.div
            initial={{
              x: introFinished ? 0 : '-200%',
              opacity: introFinished ? 1 : 0
            }}
            animate={{
              x: introFinished ? 0 : '-200%',
              opacity: introFinished ? 1 : 0,
              transition: {
                type: 'spring',
                stiffness: 300,
                damping: 20
              }
            }}
            layoutId='underline'
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`${style.underline} ${!introFinished ? style.intro : ''}`}
          />
        )}
      </motion.div>

      <motion.div
        variants={childVariant}
        className={`${style.downloads} ${introFinished && activeTab === 'downloads' ? style.active : ''}`}
        onClick={() => {
          closeViewer('downloads');
        }}
      >
        <motion.div variants={iconVariant} initial='normal' animate='resize'>
          <Download />
        </motion.div>
        <motion.span variants={labelVariants} initial='hidden' animate='show'>
          Downloads
        </motion.span>
        {activeTab === 'downloads' && (
          <motion.div
            initial={{
              x: introFinished ? 0 : '-300%',
              opacity: introFinished ? 1 : 0
            }}
            animate={{
              x: introFinished ? 0 : '-300%',
              opacity: introFinished ? 1 : 0,
              transition: {
                type: 'spring',
                stiffness: 300,
                damping: 20
              }
            }}
            layoutId='underline'
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`${style.underline} ${!introFinished ? style.intro : ''}`}
          />
        )}
      </motion.div>

      <motion.div
        variants={childVariant}
        className={`${style.library} ${introFinished && activeTab === 'library' ? style.active : ''}`}
        onClick={() => {
          closeViewer('library');
        }}
      >
        <motion.div variants={iconVariant} initial='normal' animate='resize'>
          <BookOpen />
        </motion.div>
        <motion.span variants={labelVariants} initial='hidden' animate='show'>
          Library
        </motion.span>
        {activeTab === 'library' && (
          <motion.div
            initial={{
              x: introFinished ? 0 : '200%',
              opacity: introFinished ? 1 : 0
            }}
            animate={{
              x: introFinished ? 0 : '200%',
              opacity: introFinished ? 1 : 0,
              transition: {
                type: 'spring',
                stiffness: 300,
                damping: 20
              }
            }}
            layoutId='underline'
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`${style.underline} ${!introFinished ? style.intro : ''}`}
          />
        )}
      </motion.div>

      <motion.div
        variants={childVariant}
        className={`${style.settings} ${introFinished && activeTab === 'settings' ? style.active : ''}`}
        onClick={() => {
          closeViewer('settings');
        }}
      >
        <motion.div variants={iconVariant} initial='normal' animate='resize'>
          <Settings />
        </motion.div>
        <motion.span variants={labelVariants} initial='hidden' animate='show'>
          Settings
        </motion.span>
        {activeTab === 'settings' && (
          <motion.div
            initial={{
              x: introFinished ? 0 : '100%',
              opacity: introFinished ? 1 : 0
            }}
            animate={{
              x: introFinished ? 0 : '100%',
              opacity: introFinished ? 1 : 0,
              transition: {
                type: 'spring',
                stiffness: 300,
                damping: 20
              }
            }}
            layoutId='underline'
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`${style.underline} ${!introFinished ? style.intro : ''}`}
          />
        )}
      </motion.div>
    </motion.section>
  );
}

export default Navigator;
