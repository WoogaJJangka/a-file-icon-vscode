import os
from typing import Any

MAX_SIZE = 10  # 한글 주석


@dataclass
class Greeter(Base):
    """인사하는 클래스."""

    def greet(self, name: str, times=2) -> str:
        text = f"Hello {name}\n"
        print(len(text), sep="")
        return self.prefix + text
