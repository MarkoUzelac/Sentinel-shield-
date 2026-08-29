const email = "test@example.com";
fetch(`https://api.xposedornot.com/v1/breach-analytics?email=${email}`)
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d, null, 2)))
  .catch(e => console.error(e));
