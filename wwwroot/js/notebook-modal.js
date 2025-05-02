
// This code handles the notebook creation modal and toast notifications
document.addEventListener('DOMContentLoaded', function () {
    // Make sure Bootstrap JS is loaded, or else modals and toasts won't work
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap JavaScript is not loaded. Modal and toast functionality will not work.');
        return;
    }

    // Get modal and form elements from the page
    const notebookModal = document.getElementById('newNotebookModal'); // The modal popup for creating a notebook
    const notebookForm = document.getElementById('createNotebookForm'); // The form inside the modal

    // Only run this if both modal and form exist
    if (notebookModal && notebookForm) {

        // Set up the Bootstrap modal so we can open/close it in code
        const modal = new bootstrap.Modal(notebookModal);

        // If there's a success message in the HTML, show it as a toast
        const successMessage = document.body.getAttribute('data-success-message');
        if (successMessage && successMessage.trim() !== '') {
            showToast(successMessage, 'success');
        }

        
         //Handles the form submission for creating a notebook.
         //Shows errors if the form is not valid, or sends the data to the server if it is.
         //@param {Event} event - The event object from the form submit.
         
        notebookForm.addEventListener('submit', function (event) {
            event.preventDefault(); // Don't reload the page

            // If the form is not valid, show validation errors and stop
            if (!notebookForm.checkValidity()) {
                event.stopPropagation();
                notebookForm.classList.add('was-validated');
                return;
            }

            // Collect all the form data
            const formData = new FormData(notebookForm);

            // Send the form data to the server using fetch (AJAX)
            fetch(notebookForm.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest' // Tells server this is AJAX
                }
            })
                .then(response => {
                    // If the server returns an error, handle it
                    if (!response.ok) {
                        return response.json().then(errorData => {
                            throw new Error(JSON.stringify(errorData));
                        });
                    }
                    // Otherwise, get the response data
                    return response.json();
                })
                .then(data => {
                    // If successful: close modal, show success message, and reload page
                    modal.hide();
                    showToast('Notebook created successfully!', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                })
                .catch(error => {
                    // If something goes wrong, try to show a helpful error message
                    console.error('Error:', error);

                    try {
                        // Try to show specific validation errors from the server
                        const errorData = JSON.parse(error.message);
                        let errorMessage = 'Validation failed: ';

                        if (errorData.errors) {
                            // List all field errors
                            errorMessage += Object.entries(errorData.errors)
                                .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
                                .join('; ');
                        } else if (errorData.title) {
                            errorMessage = errorData.title;
                        } else {
                            errorMessage = 'Server validation failed';
                        }

                        showToast(errorMessage, 'danger');
                    } catch (e) {
                        // If we can't figure out the error, just show something basic
                        showToast('Failed to create notebook: ' + error.message, 'danger');
                    }
                });

        });

        
         //When the modal closes, reset the form and remove validation styles.
         
        notebookModal.addEventListener('hidden.bs.modal', function () {
            notebookForm.reset(); // Clear the form fields
            notebookForm.classList.remove('was-validated'); // Remove validation styles

            // Remove any green/red input borders
            notebookForm.querySelectorAll('.is-invalid, .is-valid').forEach(field => {
                field.classList.remove('is-invalid', 'is-valid');
            });
        });
    }

    
        //Shows a Bootstrap toast message in the corner of the page.
       // @param {string} message - The text to show in the toast.
       // @param {string} type - The type of toast ('success', 'danger', 'info', etc.)
     
    function showToast(message, type = 'info') {
        // Find the toast container or make a new one if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }

        // Create the toast element
        const toastEl = document.createElement('div');
        toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');

        // Add the message and a close button to the toast
        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        // Add the toast to the container
        toastContainer.appendChild(toastEl);

        // Show the toast and set it to disappear after 3 seconds
        const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 3000 });
        toast.show();

        // When the toast is hidden, remove it from the page
        toastEl.addEventListener('hidden.bs.toast', function () {
            toastEl.remove();
        });
    }

});
