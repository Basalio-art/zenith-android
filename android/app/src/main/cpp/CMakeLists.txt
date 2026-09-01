cmake_minimum_required(VERSION 3.22.1)

project("zenith")

add_library(zenith_jni SHARED zenith_jni.c)

add_library(zenith_go SHARED IMPORTED)

set_target_properties(zenith_go PROPERTIES
    IMPORTED_LOCATION
    "${CMAKE_CURRENT_SOURCE_DIR}/../jniLibs/arm64-v8a/libzenith.so"
)

target_include_directories(zenith_jni PRIVATE
    "${CMAKE_CURRENT_SOURCE_DIR}"
)

target_link_libraries(zenith_jni
    zenith_go
    log
)