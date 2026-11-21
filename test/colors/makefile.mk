# 한글 주석
CC := gcc
CFLAGS = -O2 -Wall

.PHONY: all clean

all: main

main: main.o util.o
	$(CC) $(CFLAGS) -o $@ $^

%.o: %.c
	@echo "Compiling $<"
	$(CC) -c $< -o $@

clean:
	rm -f *.o main
