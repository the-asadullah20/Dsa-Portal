// Authorized users who can upload files
const AUTHORIZED_USERS = [
    'bcsf23m020@pucit.edu.pk',
    'bcsf23m002@pucit.edu.pk',
    'bcsf23m018@pucit.edu.pk'
];

// Google Spreadsheet links for marksheets
let marksheetLinks = {
    csMor: 'https://docs.google.com/spreadsheets/d/1FIM4J9zfNlU2KsH0Jy8dFe6OZxXZU-lxDJ5qWKig_ms/edit?gid=1109786914#gid=1109786914', // DSA Morning
    csAft: 'https://docs.google.com/spreadsheets/d/1bsHF7ctmRPE1zBD2wbsPA0ILyiu9ydPSqmgzKCpnTYo/edit?gid=0#gid=0'  // DSA Afternoon
};

// Current user state
let currentUser = null;
let isAuthorized = false;
let authToken = null;

// API base URL (change this to your backend URL when deployed)
const API_BASE_URL = 'https://dsa-portal-backend.onrender.com';

// Handle login with backend
async function handleLogin(email, password) {
    const errorElement = document.getElementById('loginError');
    
    if (!email || !password) {
        showError('Please enter both email and password');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.email;
            isAuthorized = true;
            authToken = data.token;
            
            // Save to localStorage
            localStorage.setItem('currentUser', currentUser);
            localStorage.setItem('authToken', authToken);
            
            // Update UI
            updateUI();
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('emailLoginForm').reset();
            showSuccess('Successfully signed in as TA! You can now upload files.');
        } else {
            showError(data.message || 'Login failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('Login error:', error);
        console.error('Error details:', error.message);
        showError(`Failed to connect to server: ${error.message}. Please check if backend is running.`);
    }
}

// Setup email login form
function setupEmailLogin() {
    const form = document.getElementById('emailLoginForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            await handleLogin(email, password);
        });
    }
}

// Show error message
function showError(message) {
    const errorElement = document.getElementById('loginError');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

// Show success message
function showSuccess(message) {
    // Create a temporary success notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Save marksheet links first to ensure they're available
    saveMarksheetLinks();
    
    checkAuthStatus();
    setupEventListeners();
    loadFiles();
    setupMarksheetLinks();
    setupEmailLogin();
});

// Check if user is logged in
async function checkAuthStatus() {
    const savedUser = localStorage.getItem('currentUser');
    const savedToken = localStorage.getItem('authToken');
    
    if (savedUser && savedToken) {
        // Verify token with backend
        try {
            const response = await fetch(`${API_BASE_URL}/api/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: savedUser, token: savedToken })
            });
            
            const data = await response.json();
            
            if (data.success) {
                currentUser = savedUser;
                isAuthorized = true;
                authToken = savedToken;
                updateUI();
            } else {
                // Token invalid, clear storage
                localStorage.removeItem('currentUser');
                localStorage.removeItem('authToken');
            }
        } catch (error) {
            console.error('Auth verification error:', error);
            // If backend is not available, allow local auth for viewing
            currentUser = savedUser;
            isAuthorized = AUTHORIZED_USERS.includes(currentUser);
            updateUI();
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    // Login button
    document.getElementById('loginBtn').addEventListener('click', function() {
        document.getElementById('loginModal').style.display = 'block';
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', function() {
        logout();
    });

    // Close modal (using event delegation for dynamic content)
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('close')) {
            document.getElementById('loginModal').style.display = 'none';
        }
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('loginModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Login form is handled by backend API

    // Marksheet cards
    document.getElementById('csMorCard').addEventListener('click', function() {
        if (marksheetLinks.csMor) {
            window.open(marksheetLinks.csMor, '_blank');
        } else {
            alert('Marksheet link not configured. Please contact administrator.');
        }
    });

    document.getElementById('csAftCard').addEventListener('click', function() {
        if (marksheetLinks.csAft) {
            window.open(marksheetLinks.csAft, '_blank');
        } else {
            alert('Marksheet link not configured. Please contact administrator.');
        }
    });
}

// Login is now handled by backend API

// Logout function
function logout() {
    currentUser = null;
    isAuthorized = false;
    authToken = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    
    updateUI();
    showSuccess('Successfully signed out!');
}

// Update UI based on auth status
function updateUI() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userDisplay = document.getElementById('userDisplay');
    
    if (currentUser) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'flex';
        
        // Display user name or email
        let displayName = currentUser.split('@')[0];
        if (userDisplay) {
            userDisplay.textContent = displayName;
        }
    } else {
        loginBtn.style.display = 'flex';
        logoutBtn.style.display = 'none';
    }

    // Show/hide upload areas for all categories
    const uploadAreaIds = [
        'morningLabUploadArea', 'morningLabSolutionUploadArea',
        'morningQuizUploadArea', 'morningQuizSolutionUploadArea',
        'afternoonLabUploadArea', 'afternoonLabSolutionUploadArea',
        'afternoonQuizUploadArea', 'afternoonQuizSolutionUploadArea'
    ];
    
    uploadAreaIds.forEach(id => {
        const area = document.getElementById(id);
        if (area) {
            area.style.display = isAuthorized ? 'block' : 'none';
        }
    });
}

// Load files from backend
async function loadFiles() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/files`);
        const data = await response.json();
        
        if (data.success && data.files) {
            const fileCategories = [
                'morningLab', 'morningLabSolution', 'morningQuiz', 'morningQuizSolution',
                'afternoonLab', 'afternoonLabSolution', 'afternoonQuiz', 'afternoonQuizSolution'
            ];
            
            fileCategories.forEach(category => {
                const files = data.files[category] || [];
                displayFiles(category, files);
            });
        } else {
            // Fallback to localStorage if backend fails
            loadFilesFromLocalStorage();
        }
    } catch (error) {
        console.error('Error loading files from backend:', error);
        // Fallback to localStorage
        loadFilesFromLocalStorage();
    }
}

// Fallback: Load files from localStorage
function loadFilesFromLocalStorage() {
    const fileCategories = [
        'morningLab', 'morningLabSolution', 'morningQuiz', 'morningQuizSolution',
        'afternoonLab', 'afternoonLabSolution', 'afternoonQuiz', 'afternoonQuizSolution'
    ];
    
    fileCategories.forEach(category => {
        const files = getFilesFromStorage(category);
        displayFiles(category, files);
    });
}

// Get files from localStorage (fallback)
function getFilesFromStorage(category) {
    const stored = localStorage.getItem(`files_${category}`);
    return stored ? JSON.parse(stored) : [];
}

// Save files to localStorage (fallback)
function saveFilesToStorage(category, files) {
    localStorage.setItem(`files_${category}`, JSON.stringify(files));
}

// Display files in the grid
function displayFiles(category, files) {
    const containerId = `${category}Files`;
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    files.forEach((file, index) => {
        const fileItem = createFileItem(file, category, index);
        container.appendChild(fileItem);
    });
}

// Create file item element
function createFileItem(file, category, index) {
    const div = document.createElement('div');
    div.className = 'file-item';
    
    const icon = document.createElement('div');
    icon.className = 'file-icon';
    const iconElement = document.createElement('i');
    const fileType = file.type || (file.name.split('.').pop().toLowerCase());
    if (fileType === 'pdf') {
        iconElement.className = 'fas fa-file-pdf';
    } else {
        iconElement.className = 'fas fa-file-word';
    }
    icon.appendChild(iconElement);
    
    const name = document.createElement('div');
    name.className = 'file-name';
    name.textContent = file.name;
    
    const actions = document.createElement('div');
    actions.className = 'file-actions';
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn-download';
    const downloadIcon = document.createElement('i');
    downloadIcon.className = 'fas fa-download';
    downloadBtn.appendChild(downloadIcon);
    const downloadText = document.createTextNode(' Download');
    downloadBtn.appendChild(downloadText);
    downloadBtn.onclick = () => downloadFile(file, category, index);
    
    actions.appendChild(downloadBtn);
    
    if (isAuthorized) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        const deleteIcon = document.createElement('i');
        deleteIcon.className = 'fas fa-trash';
        deleteBtn.appendChild(deleteIcon);
        const deleteText = document.createTextNode(' Delete');
        deleteBtn.appendChild(deleteText);
        deleteBtn.onclick = () => deleteFile(category, index);
        actions.appendChild(deleteBtn);
    }
    
    div.appendChild(icon);
    div.appendChild(name);
    div.appendChild(actions);
    
    return div;
}

// Upload file function
async function uploadFile(category) {
    if (!isAuthorized) {
        showError('You are not authorized to upload files.');
        return;
    }

    const inputId = `${category}FileInput`;
    const input = document.getElementById(inputId);
    const files = input.files;

    if (files.length === 0) {
        showError('Please select a file to upload.');
        return;
    }

    // Upload each file
    for (const file of Array.from(files)) {
        // Validate file type
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (fileExtension !== 'pdf' && fileExtension !== 'docx') {
            showError(`${file.name} is not a valid file. Only PDF and DOCX files are allowed.`);
            continue;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', category);
            formData.append('email', currentUser);

            const response = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                // Reload files to show the new file
                await loadFiles();
                showSuccess(`File "${file.name}" uploaded successfully!`);
            } else {
                showError(data.message || 'Failed to upload file');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showError('Failed to upload file. Please try again.');
        }
    }

    // Clear input
    input.value = '';
}

// Download file function
function downloadFile(file, category, index) {
    // If file has a path (from backend), use it
    if (file.path) {
        const link = document.createElement('a');
        link.href = `${API_BASE_URL}${file.path}`;
        link.download = file.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else if (file.data) {
        // Fallback for localStorage files
        const link = document.createElement('a');
        link.href = file.data;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        showError('File not found.');
    }
}

// Delete file function
async function deleteFile(category, index) {
    if (!isAuthorized) {
        showError('You are not authorized to delete files. Please login as TA.');
        return;
    }

    // Get current files to find the file to delete
    try {
        const response = await fetch(`${API_BASE_URL}/api/files`);
        const data = await response.json();
        
        let files = [];
        if (data.success && data.files && data.files[category]) {
            files = data.files[category];
        } else {
            // Fallback to localStorage
            files = getFilesFromStorage(category);
        }
        
        const fileToDelete = files[index];
        
        if (!fileToDelete) {
            showError('File not found.');
            return;
        }

        // Show confirmation with file name
        const confirmMessage = `Are you sure you want to delete "${fileToDelete.name}"?\n\nThis action cannot be undone.`;
        
        if (!confirm(confirmMessage)) {
            return;
        }

        // Delete from backend if file has an ID
        if (fileToDelete.id) {
            try {
                const deleteResponse = await fetch(`${API_BASE_URL}/api/files/${category}/${fileToDelete.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: currentUser })
                });

                const deleteData = await deleteResponse.json();

                if (deleteData.success) {
                    // Reload files
                    await loadFiles();
                    showSuccess(`File "${fileToDelete.name}" deleted successfully!`);
                } else {
                    showError(deleteData.message || 'Failed to delete file');
                }
            } catch (error) {
                console.error('Delete error:', error);
                showError('Failed to delete file. Please try again.');
            }
        } else {
            // Fallback: Delete from localStorage
            files.splice(index, 1);
            saveFilesToStorage(category, files);
            displayFiles(category, files);
            showSuccess(`File "${fileToDelete.name}" deleted successfully!`);
        }
    } catch (error) {
        console.error('Error getting files:', error);
        showError('Failed to delete file. Please try again.');
    }
}

// Setup marksheet links (to be configured)
function setupMarksheetLinks() {
    // Load from localStorage if available
    const storedLinks = localStorage.getItem('marksheetLinks');
    if (storedLinks) {
        const parsed = JSON.parse(storedLinks);
        // Only use stored links if they exist, otherwise use default
        if (parsed.csMor && parsed.csAft) {
            marksheetLinks = parsed;
        } else {
            // Save the default links we have
            saveMarksheetLinks();
        }
    } else {
        // Save the default links we have
        saveMarksheetLinks();
    }
}

// Save marksheet links
function saveMarksheetLinks() {
    localStorage.setItem('marksheetLinks', JSON.stringify(marksheetLinks));
}

// Function to update marksheet links (can be called from browser console)
window.updateMarksheetLinks = function(csMorLink, csAftLink) {
    marksheetLinks.csMor = csMorLink;
    marksheetLinks.csAft = csAftLink;
    saveMarksheetLinks();
    alert('Marksheet links updated successfully!');
};

// Export for external use
window.portalConfig = {
    updateMarksheetLinks: function(csMorLink, csAftLink) {
        marksheetLinks.csMor = csMorLink;
        marksheetLinks.csAft = csAftLink;
        saveMarksheetLinks();
        alert('Marksheet links updated successfully!');
    },
    getMarksheetLinks: function() {
        return marksheetLinks;
    }
};

