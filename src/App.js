import logo from "./logo.svg";
import "./App.css";

import { useEffect, useState } from "react";

import {
  createCampaign,
  getVaults,
  addLamports,
  withdrawFunds,
} from "./connections";
global.Buffer = global.Buffer || require("buffer").Buffer;

function App() {
  const [name, setName] = useState("");
  const [vaults, setVaults] = useState([]);

  useEffect(() => {
    getVaults(setVaults);
  }, []);

  useEffect(() => {
    console.log("Vaults:  ", vaults);
  }, [vaults]);

  const handleClick = async () => {
    await createCampaign(name);
    getVaults(setVaults);
  };

  const handleAdd = async (address) => {
    await addLamports(address);
    getVaults(setVaults);
  };

  const handleWithdraw = async (address) => {
    await withdrawFunds(address);
    getVaults(setVaults);
  };

  return (
    <div className="App">
      <div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={() => handleClick()}>Generate new vault</button>
      </div>
      {vaults.map((v) => {
        return (
          <div key={v.pubId.toString(9)}>
            <div>{v.name}</div>
            <div>{v.admin}</div>
            <div>{v.amount.toString()}</div>
            <button onClick={() => handleAdd(v.pubId)}>Add 1 Lamport</button>
            <button onClick={() => handleWithdraw(v.pubId)}>Withdraw</button>
          </div>
        );
      })}
    </div>
  );
}

export default App;
