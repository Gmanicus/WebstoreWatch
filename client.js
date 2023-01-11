let loader;
let form1;
let form2;
let form3;
let form4;
let form5;
let form6;
let form7;
let selectedExtension;

const SERVER_IP = "https://meet1.stevemartin.work:5000";

window.onload = () => {
    loader = document.getElementById("loading-icon");
    form1 = document.getElementById("form-1");
    form2 = document.getElementById("form-2");
    form3 = document.getElementById("form-3");
    form4 = document.getElementById("form-4");
    form5 = document.getElementById("form-5");
    form6 = document.getElementById("form-6");
    form7 = document.getElementById("form-7");
}

async function getExtension() {
    let id = document.getElementById("input-ext").value;

    // hide form and show loading spinner
    form1.classList.add("hidden");
    loader.classList.remove("hidden");
    
    
    let response = await fetch(`${SERVER_IP}/extension`, {
        method: 'POST',
        mode: "cors",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({"ext-id": id})
    }).catch(() => false)

    // Throw bad request
    if (response.status == 400) {
        loader.classList.add("hidden");
        form7.classList.remove("hidden");
        return;
    // Throw error
    } else if (!response.ok) {
        loader.classList.add("hidden");
        form5.classList.remove("hidden");
        return;
    }
    
    let data = await response.json();
    
    selectedExtension = data;
    selectedExtension.id = id;

    document.getElementById("ext-icon").src = selectedExtension.icon;
    document.getElementById("ext-title").innerText = selectedExtension.name;
    document.getElementById("ext-author").innerText = `By ${selectedExtension.author}`;
    document.getElementById("ext-summary").innerText = selectedExtension.summary;

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

    let response = await fetch(`${SERVER_IP}/watch`, {
        method: 'POST',
        mode: "cors",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "email": email,
            "ext-id": selectedExtension.id,
            "ext-name": selectedExtension.name
        })
    }).catch(() => false)
    
    loader.classList.add("hidden");

    if (response?.ok && response?.status != 418) form4.classList.remove("hidden");
    else if (response?.status == 418)            form6.classList.remove("hidden");
    else                                         form5.classList.remove("hidden");
}