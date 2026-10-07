/**
 * HouseArt shared component.
 *
 * Local decorative property illustration; no external image request is necessary.
 * variant changes only the repeated color palette; aria-hidden marks it as decorative.
 */

import React from "react";

/**
 * Local decorative property illustration; no external image request is necessary.
 * variant changes only the repeated color palette; aria-hidden marks it as decorative.
 */
export function HouseArt({ variant = 0 }) {
  return (
    <svg className="house-art" viewBox="0 0 400 210" aria-hidden="true">
      <rect
        width="400"
        height="210"
        fill={["#e4e8dc", "#eddfcf", "#dce6e5", "#e8e3d9"][variant % 4]}
      />
      <circle cx="310" cy="45" r="25" fill="#f8f1d2" />
      <path d="M0 155Q65 126 128 164T280 145T400 146V210H0" fill="#bacab3" />
      <path
        d="M60 170V70L163 33L263 69V170"
        fill={["#f6f0e4", "#dba77e", "#ece9df", "#e2c9ae"][variant % 4]}
      />
      <path d="M50 76L163 28L275 76" fill="none" stroke="#667664" strokeWidth="10" />
      <path d="M144 170V107H185V170" fill="#5d735d" />
      <rect x="84" y="92" width="37" height="45" rx="2" fill="#82a099" />
      <rect x="209" y="92" width="31" height="45" rx="2" fill="#82a099" />
      <path
        d="M102 93V137M84 113H121M224 93V137M209 113H240"
        stroke="#e5edde"
        strokeWidth="3"
      />
      <rect x="273" y="108" width="71" height="62" fill="#f2eadf" />
      <path d="M268 109L306 82L349 109" fill="#97a58d" />
      <rect x="292" y="128" width="26" height="26" fill="#7e9e92" />
      <path d="M359 172V100" stroke="#536e53" strokeWidth="5" />
      <ellipse cx="359" cy="90" rx="24" ry="37" fill="#789473" />
      <path d="M36 180V122" stroke="#698561" strokeWidth="5" />
      <ellipse cx="36" cy="116" rx="22" ry="34" fill="#8da680" />
      <path d="M145 172L129 210H219L186 172" fill="#e8dac4" />
      <path d="M0 188H116M239 188H400" stroke="#a7b99a" strokeWidth="3" />
    </svg>
  );
}
