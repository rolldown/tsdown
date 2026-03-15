## style.css

```css
@media screen {
  .box {
    animation: both BOX;
  }

  @keyframes BOX {
    0%, 100% {
      background-color: green;
    }
  }
}

@media print {
  .box {
    animation: both BOX;
  }

  @keyframes BOX {
    0%, 100% {
      background-color: red;
    }
  }
}

```
