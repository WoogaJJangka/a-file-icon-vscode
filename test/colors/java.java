package demo;

import java.util.List;

/** Doc comment */
@SuppressWarnings("unused")
public class Greeter {
    private static final int MAX_SIZE = 10;
    private final String name;

    public Greeter(String name) {
        this.name = name;
    }

    public List<String> greet(int times) {
        return List.of("Hello " + name);
    }
}
