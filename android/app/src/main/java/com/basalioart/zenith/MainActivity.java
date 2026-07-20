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
            
            // FIXED: Path mapped inside TERMUX_APP sub-class
            intent.setClassName(
                TermuxConstants.TERMUX_PACKAGE_NAME, 
                TermuxConstants.TERMUX_APP.RUN_COMMAND_SERVICE_NAME
            );
            
            // FIXED: Path nested inside TERMUX_APP.RUN_COMMAND_SERVICE sub-class
            intent.setAction(TermuxConstants.TERMUX_APP.RUN_COMMAND_SERVICE.ACTION_RUN_COMMAND);

            // FIXED: Path nested inside TERMUX_APP.RUN_COMMAND_SERVICE sub-class
            intent.putExtra(
                TermuxConstants.TERMUX_APP.RUN_COMMAND_SERVICE.EXTRA_COMMAND_PATH, 
                TermuxConstants.TERMUX_BIN_PREFIX_DIR_PATH + "/bin/bash"
            );

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

            // FIXED: Nested extra string references updated
            intent.putExtra(
                TermuxConstants.TERMUX_APP.RUN_COMMAND_SERVICE.EXTRA_ARGUMENTS, 
                new String[]{"-c", script}
            );
            
            // FIXED: Nested extra string references updated
            intent.putExtra(
                TermuxConstants.TERMUX_APP.RUN_COMMAND_SERVICE.EXTRA_BACKGROUND, 
                true
            ); 

            startService(intent);
            
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
