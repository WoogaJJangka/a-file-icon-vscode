-- 한글 주석
local MAX_SIZE = 10

local Greeter = {}
Greeter.__index = Greeter

function Greeter.new(name)
  return setmetatable({ name = name or "world" }, Greeter)
end

function Greeter:greet(times)
  local message = "Hello " .. self.name .. "\n"
  return string.rep(message, times)
end

print(Greeter.new():greet(2), nil, true, MAX_SIZE)
