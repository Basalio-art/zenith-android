#include <jni.h>
#include <dlfcn.h>
#include <android/log.h>

#define LOG_TAG "ZenithJNI"

typedef void (*StartServerFunc)(void);

JNIEXPORT void JNICALL
Java_com_basalioart_zenith_GoBackend_startServer(
        JNIEnv *env,
        jclass clazz) {

    void *handle = dlopen(
        "libzenith.so",
        RTLD_NOW
    );

    if (handle == NULL) {
        const char *error = dlerror();

        __android_log_print(
            ANDROID_LOG_ERROR,
            LOG_TAG,
            "Failed to load libzenith.so: %s",
            error ? error : "unknown error"
        );

        return;
    }

    dlerror();

    StartServerFunc StartServer =
        (StartServerFunc)dlsym(
            handle,
            "StartServer"
        );

    const char *error = dlerror();

    if (error != NULL) {
        __android_log_print(
            ANDROID_LOG_ERROR,
            LOG_TAG,
            "Failed to find StartServer: %s",
            error
        );

        dlclose(handle);
        return;
    }

    __android_log_print(
        ANDROID_LOG_INFO,
        LOG_TAG,
        "StartServer found. Starting Go backend..."
    );

    StartServer();
}