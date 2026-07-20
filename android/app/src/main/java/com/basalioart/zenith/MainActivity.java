package com.basalioart.zenith;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import java.io.File;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            // 1. Point directly to where Android automatically extracts native .so files
            String nativeDir = getApplicationInfo().nativeLibraryDir;
            String binaryPath = nativeDir + File.separator + "libgo_server.so";

            // 2. Fire up the Go backend directly
            Runtime.getRuntime().exec(binaryPath);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
