<?php

namespace Demo;

use InvalidArgumentException;

/** Doc comment */
class Greeter
{
    const MAX_SIZE = 10;
    private string $name = 'world';

    public function greet(int $times): string
    {
        // 한글 주석
        $message = "Hello {$this->name}\n";
        return str_repeat($message, $times) . self::MAX_SIZE;
    }
}

$greeter = new Greeter();
echo $greeter->greet(2), null, true;
