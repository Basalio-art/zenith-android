package com.basalioart.zenith;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

// Import the official Termux constants library
import com.termux.shared.termux.TermuxConstants;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        try {
            Intent intent = new Intent();
            
            // Set target component using official constants
            intent.setClassName(
                TermuxConstants.TERMUX_PACKAGE_NAME, 
                TermuxConstants.TERMUX_RUN_COMMAND_SERVICE_NAME
            );
            intent.setAction(TermuxConstants.ACTION_RUN_COMMAND);

            // 1. Pass the execution path safely using the Library Constant
            // This maps to /data/data/com.termux/files/usr/bin/bash dynamically
            intent.putExtra(
                TermuxConstants.RUN_COMMAND_SERVICE.EXTRA_COMMAND_PATH, 
                TermuxConstants.TERMUX_BIN_PREFIX_DIR_PATH + "/bin/bash"
            );

            // 2. Your Go Backend Engine Script
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

            // 3. Pass arguments using the official Library Extra key
            intent.putExtra(
                TermuxConstants.RUN_COMMAND_SERVICE.EXTRA_ARGUMENTS, 
                new String[]{"-c", script}
            );
            
            // 4. Force background mode using the Library Extra key
            // Set to true for total invisibility, or false to pop open a screen for debugging
            intent.putExtra(
                TermuxConstants.RUN_COMMAND_SERVICE.EXTRA_BACKGROUND, 
                true
            ); 

            // Fire the automated intent session
            startService(intent);
            
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
