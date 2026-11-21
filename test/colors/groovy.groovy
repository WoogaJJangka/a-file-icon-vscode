package demo

import groovy.transform.CompileStatic

/** Groovydoc comment */
@CompileStatic
class Greeter {
    static final int MAX_SIZE = 10
    String name

    def greet(int times) {
        // 한글 주석
        def message = "Hello ${name}"
        return [key: message, count: times]
    }
}
