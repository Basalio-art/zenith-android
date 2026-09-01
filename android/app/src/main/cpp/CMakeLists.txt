cmake_minimum_required(VERSION 3.22.1)

project("zenith")

add_library(zenith_jni SHARED
    zenith_jni.c
)

target_include_directories(zenith_jni PRIVATE
    "${CMAKE_CURRENT_SOURCE_DIR}"
)

target_link_libraries(zenith_jni
    log
    dl
)