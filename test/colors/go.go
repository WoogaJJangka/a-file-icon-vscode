package main

import (
	"fmt"
	"strings"
)

// MaxSize 한글 주석
const MaxSize = 10

type Greeter struct {
	Name string
}

func (g *Greeter) Greet(times int) string {
	message := fmt.Sprintf("Hello %s\n", g.Name)
	return strings.Repeat(message, times)
}

func main() {
	g := &Greeter{Name: "world"}
	fmt.Println(len(g.Greet(2)), nil, true)
}
