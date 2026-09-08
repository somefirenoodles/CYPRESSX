import * as React from "react";

function SvgRwaLogo(props: any) {
  return (
    <svg width="170px" height="40px" viewBox="0 0 170 40" xmlns="http://www.w3.org/2000/svg" {...props}>
      <text
        x="85"
        y="28"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="Arial, sans-serif"
        fontSize="28"
        fontWeight="700"
        letterSpacing="3"
      >
        AASP
      </text>
    </svg>
  );
}

export default SvgRwaLogo;
