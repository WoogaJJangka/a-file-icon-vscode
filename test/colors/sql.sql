-- 한글 주석
CREATE TABLE greeter (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL DEFAULT 'world'
);

SELECT g.name, COUNT(*) AS total
FROM greeter g
WHERE g.id > 10 AND g.name IS NOT NULL
GROUP BY g.name;
