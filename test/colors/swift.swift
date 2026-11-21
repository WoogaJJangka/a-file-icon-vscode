import Foundation

/// Doc comment
let maxSize = 10

struct Greeter {
    var name: String = "world"

    func greet(times: Int) -> String {
        // 한글 주석
        let message = "Hello \(name)\n"
        return String(repeating: message, count: times)
    }
}

let greeter = Greeter()
print(greeter.greet(times: 2), maxSize, true, nil as Int?)
