use std::collections::HashMap;

/// Doc comment
const MAX_SIZE: usize = 10;

#[derive(Debug, Clone)]
pub struct Greeter<'a> {
    name: &'a str,
}

impl<'a> Greeter<'a> {
    pub fn greet(&self, times: u32) -> String {
        // 한글 주석
        let mut message = format!("Hello {}\n", self.name);
        message.push('!');
        message.repeat(times as usize)
    }
}

fn main() {
    let counts: HashMap<String, i32> = HashMap::new();
    println!("{:?} {}", counts, MAX_SIZE);
}
