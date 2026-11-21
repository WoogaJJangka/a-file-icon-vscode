import 'dart:math';

/// Doc comment
const maxSize = 10;

class Greeter {
  final String name;

  Greeter([this.name = 'world']);

  String greet(int times) {
    // 한글 주석
    var message = 'Hello $name\n';
    return message * times;
  }
}

void main() {
  final greeter = Greeter();
  print('${greeter.greet(2)} ${max(1, maxSize)} ${null} ${true}');
}
