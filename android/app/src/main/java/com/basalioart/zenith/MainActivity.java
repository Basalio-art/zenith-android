package com.basalioart.zenith;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            // 1. Locate where to save the executable inside the phone's private app storage
            File binaryFile = new File(getFilesDir(), "libgo_server.so");
            
            // 2. Extract it from the compressed APK assets folder if it's a fresh install
            if (!binaryFile.exists()) {
                InputStream is = getAssets().open("bin/libgo_server.so");
                FileOutputStream os = new FileOutputStream(binaryFile);
                byte[] buffer = new byte[1024];
                int bytesRead;
                while ((bytesRead = is.read(buffer)) != -1) {
                    os.write(buffer, 0, bytesRead);
                }
                is.close();
                os.close();
                
                // 3. Mark the file as an executable program
                binaryFile.setExecutable(true);
            }

            // 4. Spin up your Go backend server loop in the background
            String binaryPath = binaryFile.getAbsolutePath();
            Runtime.getRuntime().exec(binaryPath);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
