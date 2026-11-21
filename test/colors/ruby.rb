require 'json'

# 한글 주석
module Demo
  MAX_SIZE = 10

  class Greeter
    attr_reader :name

    def initialize(name = "world")
      @name = name
    end

    def greet(times)
      message = "Hello #{@name}\n"
      (message * times).to_s + MAX_SIZE.to_s
    end
  end
end

puts Demo::Greeter.new.greet(2), nil, true
