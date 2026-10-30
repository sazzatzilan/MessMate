import net from "net";
import { spawn } from "child_process";

const root = process.cwd();
const nextBin = "node ./node_modules/next/dist/bin/next";

function portTaken(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function choosePort() {
  const ports = [3000, 3010, 3011, 3012, 3013, 3014, 3015];
  for (const port of ports) {
    if (!(await portTaken(port))) return port;
  }
  console.log("Ports 3000 and 3010-3015 are already in use. Close another copy of this app and try again.");
  process.exit(1);
}

const port = await choosePort();
console.log("");
console.log(`Open http://127.0.0.1:${port}`);
console.log("Leave this window open.");
console.log("");

const child = spawn(`${nextBin} dev -H 127.0.0.1 -p ${port}`, {
  stdio: "inherit",
  shell: true,
  cwd: root,
});
child.on("exit", (code) => process.exit(code ?? 0));
