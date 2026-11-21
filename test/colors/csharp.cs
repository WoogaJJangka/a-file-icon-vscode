using System;
using System.Collections.Generic;

namespace Demo
{
    /// <summary>Doc comment</summary>
    [Serializable]
    public class Greeter
    {
        private const int MaxSize = 10;
        public string Name { get; set; } = "world";

        public string Greet(int times)
        {
            // 한글 주석
            var message = $"Hello {Name}\n";
            List<string> parts = new List<string>();
            return string.Join("", parts) + message;
        }
    }
}
