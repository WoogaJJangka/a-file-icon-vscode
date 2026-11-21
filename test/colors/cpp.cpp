#include <string>
#include <vector>

#define MAX_SIZE 10

// 한글 주석
namespace demo {

/** Doc comment */
class Greeter {
public:
    explicit Greeter(std::string name) : name_(std::move(name)) {}

    std::string greet(int times) const {
        std::string message = "Hello " + name_ + "\n";
        return message;
    }

private:
    std::string name_;
};

}  // namespace demo

int main() {
    demo::Greeter greeter("world");
    std::vector<int> values{1, 2, MAX_SIZE};
    return static_cast<int>(values.size()) > 0 ? 0 : nullptr == nullptr;
}
