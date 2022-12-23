let loader;
let form1;
let form2;
let form3;

window.onload = () => {
    loader = document.getElementById("loading-icon");
    form1 = document.getElementById("form-1");
    form2 = document.getElementById("form-2");
    form3 = document.getElementById("form-3");
}

async function getExtension() {
    let id = document.getElementById("input-ext").value;
    // hide form and show loading spinner
    form1.classList.add("hidden");
    loader.classList.remove("hidden");
    
    let response = await fetch("http://localhost:5000/extension", {
        method: 'POST',
        mode: "cors",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({"ext-id": id})
    })
    
    let data = await response.json();

    // show form 2 and hide loading spinner
    form2.classList.remove("hidden");
    loader.classList.add("hidden");
}

function confirmExtension() {
    // hide form and show loading spinner
    form2.classList.add("hidden");
    loader.classList.remove("hidden");
}

function cancelExtension() {
    // go back to form 1
    form2.classList.add("hidden");
    form1.classList.remove("hidden");
}