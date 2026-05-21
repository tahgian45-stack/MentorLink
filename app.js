document.addEventListener("DOMContentLoaded", function () {
  const hamburger = document.querySelector(".hamburger");
  const sideMenu = document.querySelector(".side-menu");
  const overlay = document.querySelector(".overlay");

  if (hamburger && sideMenu && overlay) {
    hamburger.addEventListener("click", function () {
      hamburger.classList.toggle("active");
      sideMenu.classList.toggle("active");
      overlay.classList.toggle("active");
    });

    overlay.addEventListener("click", function () {
      hamburger.classList.remove("active");
      sideMenu.classList.remove("active");
      overlay.classList.remove("active");
    });
  }
});
