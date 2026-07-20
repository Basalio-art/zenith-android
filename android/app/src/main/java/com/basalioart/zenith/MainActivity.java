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

            intent.putExtra("com.termux.RUN_COMMAND_SERVICE.EXTRA_COMMAND_PATH", "/data/data/com.termux/files/usr/bin/bash");

            // --- THE MASTER AUTO-SETUP SCRIPT ---
            // Replace with your actual Go backend GitHub link:
            String gitRepoUrl = "https://github.com/Basalio-art/anime-api.git"; 
            
            String script = 
                "echo '[Zenith Engine] Checking environment...' && " +
                // 1. Check and install git/golang if missing
                "if ! command -v git &> /dev/null || ! command -v go &> /dev/null; then " +
                "  echo '[Zenith Engine] Installing dependencies...' && pkg update -y && pkg install -y git golang; " +
                "fi && " +
                // 2. Check repository state (Clone or Pull)
                "if [ ! -d ~/backend ]; then " +
                "  echo '[Zenith Engine] Cloning repository...' && git clone " + gitRepoUrl + " ~/backend; " +
                "else " +
                "  echo '[Zenith Engine] Syncing repository updates...' && cd ~/backend && git pull; " +
                "fi && " +
                // 3. Fast launch check (Compile or execute cached binary)
                "cd ~/backend && " +
                "if [ -f ./server ]; then " +
                "  echo '[Zenith Engine] Starting cached server binary...' && ./server; " +
                "else " +
                "  echo '[Zenith Engine] First time setup: Compiling binary...' && go build -o server main.go && ./server; " +
                "fi";

            intent.putExtra("com.termux.RUN_COMMAND_SERVICE.EXTRA_ARGUMENTS", new String[]{"-c", script});
            
            // Set this to false if you want Termux to open visually and show the logs during setup.
            // Change it to true later for silent background operations!
            intent.putExtra("com.termux.RUN_COMMAND_SERVICE.EXTRA_BACKGROUND", false); 

            startService(intent);
            
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
