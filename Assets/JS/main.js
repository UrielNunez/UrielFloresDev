/*---------------NAVIGATION BAR FUNCTION------------------*/ 
function menuFunction(){
    var menuBtn = document.getElementById("myNavMenu");

    if(menuBtn.className === "nav-menu"){
        menuBtn.className += " responsive ";
    }else{
        menuBtn.className = "nav-menu";
    }
}

/*---------------ADD SHADOW ON NAVIGATION BAR WHILE SROLLING------------------*/
window.onscroll = function() {headerShadow()};

function headerShadow(){
    const navHeader = document.getElementById("header");

    if(document.body.scrollTop > 50 || document.documentElement.scrollTop > 50){
        navHeader.style.boxShadow = "0 5px 20px rgba(255, 255, 255, 0.1)";
        navHeader.style.height = "70px";
        navHeader.style.lineHeight = "70px";
    }else{
        navHeader.style.boxShadow = "none";
        navHeader.style.height = "90px";
        navHeader.style.lineHeight = "90px";
    }
}