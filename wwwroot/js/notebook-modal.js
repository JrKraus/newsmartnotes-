
document.addEventListener('DOMContentLoaded', function () {
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap JavaScript is not loaded. Modal and toast functionality will not work.');
        return;
    }

    const notebookModal = document.getElementById('newNotebookModal');
    const notebookForm = document.getElementById('createNotebookForm');

    if (notebookModal && notebookForm) {
       
        const modal = new bootstrap.Modal(notebookModal);

            
        const successMessage = document.body.getAttribute('data-success-message');
        if (successMessage && successMessage.trim() !== '') {
            showToast(successMessage, 'success');
        }

            
        notebookForm.addEventListener('submit', function (event) {
            event.preventDefault();

            if (!notebookForm.checkValidity()) {
                event.stopPropagation();
                notebookForm.classList.add('was-validated');
                return;
            }

            const formData = new FormData(notebookForm);
            fetch(notebookForm.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
                .then(response => {
                    if (!response.ok) {
                            
                        return response.json().then(errorData => {
                            throw new Error(JSON.stringify(errorData));
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    modal.hide();
                    showToast('Notebook created successfully!', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                })
                .catch(error => {
                    console.error('Error:', error);

                        
                    try {
                        const errorData = JSON.parse(error.message);
                        let errorMessage = 'Validation failed: ';

                        
                        if (errorData.errors) {
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
                            
                        showToast('Failed to create notebook: ' + error.message, 'danger');
                    }
                });

            
        });

            
        notebookModal.addEventListener('hidden.bs.modal', function () {
            notebookForm.reset();
            notebookForm.classList.remove('was-validated');

            
            notebookForm.querySelectorAll('.is-invalid, .is-valid').forEach(field => {
                field.classList.remove('is-invalid', 'is-valid');
            });
        });
    }

        
    function showToast(message, type = 'info') {
            
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }

        
        const toastEl = document.createElement('div');
        toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');

        
        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        toastContainer.appendChild(toastEl);

            
        const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 3000 });
        toast.show();

        
        toastEl.addEventListener('hidden.bs.toast', function () {
            toastEl.remove();
        });
       
    }
     
});
