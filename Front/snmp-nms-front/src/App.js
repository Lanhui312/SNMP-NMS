import React, { useState, createContext, useContext } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Navbar from "./Navbar";
import Home from "./components/Home";
import LoginPage from "./components/Login";
import Device from "./components/devices/Device";
import Logs from "./components/Log/Logs";
import Register from "./components/Register";
import CreateDevice from "./components/devices/CreateDevice";
import { AuthProvider, useAuth } from "./AuthContext";

export const AuthContext = createContext();

function App() {
  return (
    <Router>
      <AuthProvider>  
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/device" element={<Device />} />
          <Route path="/logRecord" element={<Logs />} />
          <Route path="/createDevice" element={<CreateDevice />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
