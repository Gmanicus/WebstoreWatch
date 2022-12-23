let loader;
let form1;
let form2;
let form3;
let form4;
let selectedExtension;

window.onload = () => {
    loader = document.getElementById("loading-icon");
    form1 = document.getElementById("form-1");
    form2 = document.getElementById("form-2");
    form3 = document.getElementById("form-3");
    form4 = document.getElementById("form-4");
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
    selectedExtension = data;
    selectedExtension.id = id;

    document.getElementById("ext-icon").src = data.icon;
    document.getElementById("ext-title").innerText = data.name;
    document.getElementById("ext-author").innerText = `By ${data.author}`;
    document.getElementById("ext-summary").innerText = data.summary;

    form2.getBoundingClientRect(); // Trigger reflow

    // Wait 100ms to let extension data load on page
    setTimeout(()=>{
        // show form 2 and hide loading spinner
        form2.classList.remove("hidden");
        loader.classList.add("hidden");
    }, 50)
}

function confirmExtension() {
    // hide form and show loading spinner
    form2.classList.add("hidden");
    form3.classList.remove("hidden");
}

function cancelExtension() {
    // go back to form 1
    form2.classList.add("hidden");
    form1.classList.remove("hidden");
}

async function submitWatcher() {
    let email = document.getElementById("input-email").value;
    let successTitle = document.getElementById("success-ext-name");
    successTitle.innerText = selectedExtension.name;

    // go back to form 1
    form3.classList.add("hidden");
    loader.classList.remove("hidden");

    let response = await fetch("http://localhost:5000/watch", {
        method: 'POST',
        mode: "cors",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "email": email,
            "ext-id": selectedExtension.id
        })
    })
    
    let data = await response.text();

    loader.classList.add("hidden");
    form4.classList.remove("hidden");
}