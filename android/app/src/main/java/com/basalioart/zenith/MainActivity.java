package com.basalioart.zenith;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        try {
            Intent intent = new Intent();
            intent.setClassName("com.termux", "com.termux.app.RunCommandService");
            intent.setAction("com.termux.RUN_COMMAND");

            // FIXED: Changed to the literal strings Termux actively scans for
            intent.putExtra("com.termux.RUN_COMMAND_PATH", "/data/data/com.termux/files/usr/bin/bash");

            String gitRepoUrl = "https://github.com/Basalio-art/anime-api.git"; 
            
            String script = 
                "echo '[Zenith Engine] Checking environment...' && " +
                "if ! command -v git &> /dev/null || ! command -v go &> /dev/null; then " +
                "  echo '[Zenith Engine] Installing dependencies...' && pkg update -y && pkg install -y git golang; " +
                "fi && " +
                "if [ ! -d ~/backend ]; then " +
                "  echo '[Zenith Engine] Cloning repository...' && git clone " + gitRepoUrl + " ~/backend; " +
                "else " +
                "  echo '[Zenith Engine] Syncing repository updates...' && cd ~/backend && git pull; " +
                "fi && " +
                "cd ~/backend && " +
                "if [ -f ./server ]; then " +
                "  echo '[Zenith Engine] Starting cached server binary...' && ./server; " +
                "else " +
                "  echo '[Zenith Engine] First time setup: Compiling binary...' && go build -o server main.go && ./server; " +
                "fi";

            // FIXED: String array of arguments tied to correct key
            intent.putExtra("com.termux.RUN_COMMAND_ARGUMENTS", new String[]{"-c", script});
            
            // FIXED: Corrected key name for background execution
            intent.putExtra("com.termux.RUN_COMMAND_BACKGROUND", false); 

            startService(intent);
            
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
