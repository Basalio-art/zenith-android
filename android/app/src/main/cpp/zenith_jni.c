#include <jni.h>
#include "libzenith.h"

JNIEXPORT void JNICALL
Java_com_basalioart_zenith_GoBackend_startServer(
        JNIEnv *env,
        jclass clazz) {
    StartServer();
}