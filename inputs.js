// Get all collapse buttons
const collapseButtons = document.querySelectorAll(".collapse-button");

// Iterate through each button and add a click event listener
collapseButtons.forEach((button) => {
    button.addEventListener("click", () => {
        // Find the corresponding section using the data-target attribute
        const targetId = button.getAttribute("data-target");
        const targetSection = document.getElementById(targetId);

        // Toggle the collapsed class on the section
        targetSection.classList.toggle("collapsed");  
        if (button.textContent == "+") {
            button.textContent = "⎯"
        } else {
            button.textContent = "+"
        }
    });
});
