package com.basalioart.zenith;

public class GoBackend {

    static {
        System.loadLibrary("zenith_jni");
    }

    public static native void startServer();
}
