#include "feed/parser.h"
#include <cstdio>

BookUpdate parse_message(const std::string& raw_json) {
    fprintf(stderr, "WARNING: parser not yet implemented — returning empty update\n");
    return {};
}
