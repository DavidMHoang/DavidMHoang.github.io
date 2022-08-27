// Get the modal
var overviewModal = document.getElementById("overviewModal");
var rhModal = document.getElementById("rhModal");
var opalModal = document.getElementById("opalModal");
var davisModal = document.getElementById("davisModal");
var portfolioModal = document.getElementById("portfolioModal");
var ezflowModal = document.getElementById("ezflowModal");

// Get the button that opens the modal
var overviewBtn = document.getElementById("overviewBtn");
var rhBtn = document.getElementById("rhBtn");
var opalBtn = document.getElementById("opalBtn");
var davisBtn = document.getElementById("davisBtn");
var portfolioBtn = document.getElementById("portfolioBtn");
var ezflowBtn = document.getElementById("ezflowBtn");

// Get the <span> element that closes the modal
var overviewClose = document.getElementById("overviewClose");
var rhClose = document.getElementById("rhClose");
var opalClose = document.getElementById("opalClose");
var ucdavisClose = document.getElementById("davisClose");
var portfolioClose = document.getElementById("portfolioClose");
var ezflowClose = document.getElementById("ezflowClose");

// When the user clicks on the button, open the modal
overviewBtn.onclick = () => {
    overviewModal.style.display = "block";
}
rhBtn.onclick = () => {
    rhModal.style.display = "block";
}
opalBtn.onclick = () => {
    opalModal.style.display = "block";
}
davisBtn.onclick = () => {
    davisModal.style.display = "block";
}
portfolioBtn.onclick = () => {
    portfolioModal.style.display = "block";
}
ezflowBtn.onclick = () => {
    ezflowModal.style.display = "block";
}

// When the user clicks on <span> (x), close the modal
overviewClose.onclick = () => {
    overviewModal.style.display = "none";
}
rhClose.onclick = () => {
    rhModal.style.display = "none";
}
opalClose.onclick = () => {
    opalModal.style.display = "none";

}
davisClose.onclick = () => {
    davisModal.style.display = "none";

}
portfolioClose.onclick = () => {
    portfolioModal.style.display = "none";

}
ezflowClose.onclick = () => {
    ezflowModal.style.display = "none";

}


// When the user clicks anywhere outside of the modal, close it
window.onclick = (event) => {
    if (event.target == overviewModal) {
        overviewModal.style.display = "none";
    }
    if (event.target == rhModal) {
        rhModal.style.display = "none";
    }
    if (event.target == opalModal) {
        opalModal.style.display = "none";
    }
    if (event.target == davisModal) {
        davisModal.style.display = "none";
    }
    if (event.target == portfolioModal) {
        portfolioModal.style.display = "none";
    }
    if (event.target == ezflowModal) {
        ezflowModal.style.display = "none";
    }

}

const message = document.getElementById('message');
const counter = document.getElementById('counter');

message.addEventListener('input', function (e) {
    const target = e.target;

    // Get the `maxlength` attribute
    const maxLength = target.getAttribute('maxlength');

    // Count the current number of characters
    const currentLength = target.value.length;

    counter.innerHTML = `${currentLength}/${maxLength}`;
});