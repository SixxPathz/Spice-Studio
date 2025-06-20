// SpiceStudio - My Recipe App
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const notebookCover = document.getElementById('notebook-cover');
    const openNotebookBtn = document.getElementById('open-notebook');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chat-messages');
    const recipesContainer = document.getElementById('recipes-container');
    const recipeModal = document.getElementById('recipe-modal');
    const closeButton = document.querySelector('.close-button');
    
    // Add default image for broken recipe images
    const defaultRecipeImage = 'https://spoonacular.com/recipeImages/default-recipe.jpg';
    
    // Helper function to handle image loading errors
    function handleImageError(img) {
        img.onerror = function() {
            // Replace with a default cooking image
            this.src = 'https://via.placeholder.com/312x231/e9d4c3/8e4444?text=Delicious+Recipe';
            this.alt = 'Recipe placeholder image';
        };
        return img;
    }

    // Apply error handling to all recipe images
    function setupImageErrorHandling() {
        const recipeImages = document.querySelectorAll('.polaroid-container img');
        recipeImages.forEach(img => handleImageError(img));
        
        // Also handle modal recipe image
        const modalImg = document.getElementById('modal-recipe-image');
        if (modalImg) handleImageError(modalImg);
    }
    
    // Bot personality phrases
    const greetings = [
        "Hi there! I'm your SpiceStudio assistant. What ingredients do you have in your kitchen today? 🥕🍅🧄",
        "Hello chef! What delicious ingredients are we working with today? 🍳",
        "Welcome to SpiceStudio! Tell me what's in your fridge, and I'll find something yummy! 🍲",
        "Ready to cook something amazing? Let me know what ingredients you have! 🌮"
    ];
    
    // Initialize with a random greeting
    if (chatMessages.children.length === 0) {
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        addMessageToChat('bot', randomGreeting);
    }
      // My Spoonacular API key
    const API_KEY = '19d94f8761c5481f8d80e63218206b3f';
    
    // Open notebook animation
    openNotebookBtn.addEventListener('click', function() {
        notebookCover.classList.add('open');
    });
    
    // Send message on button click
    sendBtn.addEventListener('click', sendMessage);
    
    // Send message on Enter key press
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
      // Close modal on clicking the X button
    closeButton.addEventListener('click', function() {
        recipeModal.style.display = 'none';
        // Restore body scrolling when modal is closed
        document.body.style.overflow = '';
    });
      // Close modal when clicking outside the modal content
    window.addEventListener('click', function(event) {
        if (event.target === recipeModal) {
            recipeModal.style.display = 'none';
            // Restore body scrolling when modal is closed
            document.body.style.overflow = '';
        }
    });
    
    // Handle both touch and mouse events for modal closing
    recipeModal.addEventListener('touchstart', function(event) {
        if (event.target === recipeModal) {
            recipeModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
      // handles sending messages and getting recipe results
    function sendMessage() {
        const message = userInput.value.trim();
        
        if (message !== '') {
            // show what the user typed
            addMessageToChat('user', message);
            
            // empty the input box
            userInput.value = '';
            
            // add the typing effect so it feels more real
            const typingIndicator = document.createElement('div');
            typingIndicator.className = 'message bot typing-indicator';
            typingIndicator.innerHTML = '<p>Cooking up some ideas<span class="dots">...</span></p>';
            chatMessages.appendChild(typingIndicator);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Show thinking time for a more natural experience
            setTimeout(() => {
                // Remove typing indicator
                chatMessages.removeChild(typingIndicator);
                
                // Show loading message with spinner
                addMessageToChat('bot', 'Looking for recipes with those ingredients <div class="loading-spinner"></div>');
                
                // Check for unusual ingredients (Easter egg feature)
                checkForUnusualIngredients(message);
                
                // Call API to search for recipes
                setTimeout(() => {
                    searchRecipes(message);
                }, 1500);            }, 800);
        }
    }
      
    // puts messages in the chat box
    function addMessageToChat(sender, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const messagePara = document.createElement('p');
        
        // need this for my spinner animation
        if (content.includes('<div') || content.includes('<span')) {
            messagePara.innerHTML = content;
        } else {
            messagePara.textContent = content;
        }
        
        messageDiv.appendChild(messagePara);
        chatMessages.appendChild(messageDiv);
        
        // Animation timing
        setTimeout(() => {
            messageDiv.style.opacity = '1';
        }, 10);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }      // the main recipe search function
    async function searchRecipes(ingredients) {
        try {
            let data;
            
            // see if they want veggie/vegan/etc.
            const dietPreferences = detectDietaryPreferences(ingredients);
            
            // call the api for recipes
            try {                // build the search url
                let apiUrl = `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(ingredients)}&number=6&addRecipeInformation=true&fillIngredients=true&apiKey=${API_KEY}`;
                
                // Add any dietary filters
                if (dietPreferences.isVegetarian) {
                    apiUrl += '&diet=vegetarian';
                }
                
                if (dietPreferences.isVegan) {
                    apiUrl += '&diet=vegan';
                }
                
                if (dietPreferences.isGlutenFree) {
                    apiUrl += '&intolerances=gluten';
                }
                
                if (dietPreferences.isDairyFree) {
                    apiUrl += '&intolerances=dairy';
                }
                
                console.log("Fetching recipes from API:", apiUrl);
                
                const response = await fetch(apiUrl);
                
                if (!response.ok) {
                    const errorMessage = `Failed to fetch recipes: ${response.status} ${response.statusText}`;
                    console.error(errorMessage);
                    
                    // Provide specific error messages based on status code
                    if (response.status === 401 || response.status === 403) {
                        throw new Error('API_AUTH_ERROR');
                    } else if (response.status === 429) {
                        throw new Error('API_RATE_LIMIT');
                    } else {
                        throw new Error(errorMessage);
                    }
                }
                
                const apiResponse = await response.json();                  // make sure we got something back
                if (!apiResponse.results || apiResponse.results.length === 0) {
                    console.log("No recipes found");
                    data = []; 
                } else {
                    data = apiResponse.results.map(item => ({
                        id: item.id,
                        title: item.title,
                        image: item.image,
                        missedIngredientCount: item.missedIngredientCount || Math.floor(Math.random() * 3),
                        usedIngredientCount: item.usedIngredientCount || Math.floor(Math.random() * 4)
                    }));
                    
                    console.log("Found recipes:", data);
                }
            } catch (apiError) {
                console.error("API error:", apiError);                  // show friendly error message depending on what went wrong
                if (apiError.message === 'API_AUTH_ERROR') {
                    chatMessages.removeChild(chatMessages.lastChild);
                    addMessageToChat('bot', 'API key issue - using saved recipes instead 🔑');
                    setTimeout(() => {
                        addMessageToChat('bot', 'Looking for recipes with those ingredients <div class="loading-spinner"></div>');
                    }, 1000);
                } else if (apiError.message === 'API_RATE_LIMIT') {
                    chatMessages.removeChild(chatMessages.lastChild);
                    addMessageToChat('bot', 'API limit reached - using backup recipes 📚');
                    setTimeout(() => {
                        addMessageToChat('bot', 'Looking for recipes with those ingredients <div class="loading-spinner"></div>');
                    }, 1000);
                }
                
                // Use backup recipe data
                console.warn("Using local recipe data");
                let allRecipes = getMockRecipeData();
                data = filterRecipesByDiet(allRecipes, dietPreferences);
            }
            
            // Remove loading message
            chatMessages.removeChild(chatMessages.lastChild);
              // Check if user specified dietary needs
            const dietaryRestrictionDetected = Object.values(dietPreferences).some(pref => pref === true);
            
            // Show results to user
            if (data.length > 0) {
                let responseMessage = `Found ${data.length} recipes you can make with those ingredients! 🎉`;
                
                if (dietaryRestrictionDetected) {
                    // List the restrictions applied
                    const restrictions = [];
                    if (dietPreferences.isVegetarian) restrictions.push("vegetarian");
                    if (dietPreferences.isVegan) restrictions.push("vegan");
                    if (dietPreferences.isGlutenFree) restrictions.push("gluten-free");
                    if (dietPreferences.isDairyFree) restrictions.push("dairy-free");
                    
                    responseMessage += ` Filtered for ${restrictions.join(', ')} options.`;
                }
                
                addMessageToChat('bot', responseMessage);
                
                // Update the recipes container
                displayRecipes(data);
            } else if (dietaryRestrictionDetected && allRecipes && allRecipes.length > 0) {
                // We had recipes but they were all filtered out
                addMessageToChat('bot', "I couldn't find recipes matching your dietary preferences with these ingredients. Maybe try different ingredients? 🌿");
            } else {
                addMessageToChat('bot', "Hmm, I couldn't find any recipes with those exact ingredients. Maybe try adding a few more? 🤔");
            }
            
        } catch (error) {
            console.error('Error fetching recipes:', error);
            chatMessages.removeChild(chatMessages.lastChild); // Remove loading message
            addMessageToChat('bot', 'Sorry, I had trouble finding recipes right now. Please try again! 😓');
        }
    }    // shows all the recipe cards
    function displayRecipes(recipes) {
        // start fresh
        recipesContainer.innerHTML = '';
        
        // let them know if we didn't find anything
        if (recipes.length === 0) {
            const noRecipesMsg = document.createElement('div');
            noRecipesMsg.className = 'welcome-message';            noRecipesMsg.innerHTML = `
                <p>No recipes found with those ingredients. Try adding more ingredients!</p>
                <div class="notebook-doodle">
                    <!-- Inline SVG as a fallback -->
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="width:70px; height:70px;">
                        <path fill="#8e4444" d="M64 96H0c0 123.7 100.3 224 224 224v144c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V320C288 196.3 187.7 96 64 96zm384-64c-84.2 0-157.4 46.5-195.7 115.2 27.7 30.2 48.2 66.9 59 107.6C424 243.1 512 147.9 512 32h-64z"></path>
                    </svg>
                </div>
            `;
            recipesContainer.appendChild(noRecipesMsg);
            return;
        }
        
        // Add each recipe card with staggered animation
        recipes.forEach((recipe, index) => {
            // Create the card
            const card = createRecipeCard(recipe);
            
            // Set animation order for staggered effect
            card.style.setProperty('--animation-order', index);
            
            // Add to container
            recipesContainer.appendChild(card);
            
            // Add click event to show recipe details
            card.addEventListener('click', function() {
                showRecipeDetails(recipe);
            });
        });            // Add an empty message at the end that will display if no recipes are found
        if (recipes.length <= 3) {
            const emptySpace = document.createElement('div');
            emptySpace.className = 'recipe-card empty';
            emptySpace.style.boxShadow = 'none';
            emptySpace.style.height = '20px';
            recipesContainer.appendChild(emptySpace);
        }
          // Adjust layout for mobile after recipes are loaded
        setTimeout(() => {
            adjustLayoutForMobile();
            setupImageErrorHandling(); // Apply error handling to all images
        }, 100);
    }
      // Creates a polaroid-style recipe card
    function createRecipeCard(recipe) {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        
        // Random slight rotation for casual look
        const rotation = Math.random() * 6 - 3;
        card.style.transform = `rotate(${rotation}deg)`;
        
        card.innerHTML = `
            <div class="polaroid-container" data-caption="${recipe.title}">
                <img src="${recipe.image}" alt="${recipe.title}" onerror="this.src='https://via.placeholder.com/312x231/e9d4c3/8e4444?text=Delicious+Recipe'; this.alt='Recipe placeholder image';">
                <div class="polaroid-tape"></div>
            </div>
            <div class="recipe-card-content">
                <h3>${recipe.title}</h3>
                <div class="recipe-card-ingredients">
                    ${recipe.missedIngredientCount > 0 ? 
                      `<p>You need ${recipe.missedIngredientCount} more ingredient${recipe.missedIngredientCount > 1 ? 's' : ''}</p>` : 
                      '<p>You have all the ingredients! 🎉</p>'}
                </div>
            </div>
        `;
          // Add hover effect for desktop and touch effect for mobile
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        if (!isTouchDevice) {
            // Only add hover effects on non-touch devices
            card.addEventListener('mouseover', function() {
                this.style.transform = `translateY(-10px) rotate(${rotation}deg)`;
                this.style.boxShadow = '0 15px 30px rgba(0, 0, 0, 0.2)';
                this.style.transition = 'all 0.3s ease';
            });
            
            card.addEventListener('mouseout', function() {
                this.style.transform = `rotate(${rotation}deg)`;
                this.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
            });
        } else {
            // For touch devices, add touch feedback
            card.addEventListener('touchstart', function() {
                this.style.transform = `scale(0.98) rotate(${rotation}deg)`;
                this.style.transition = 'transform 0.2s ease';
            });
            
            card.addEventListener('touchend', function() {
                this.style.transform = `rotate(${rotation}deg)`;
                this.style.transition = 'transform 0.3s ease';
            });
        }
        
        // Add animation when card is first created
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = `rotate(${rotation}deg)`;
        }, 10);
        
        return card;
    }
      // Opens modal with detailed recipe information
    async function showRecipeDetails(recipePreview) {
        let recipeDetail;
        
        try {
            console.log("Getting details for:", recipePreview.id);
            
            const response = await fetch(
                `https://api.spoonacular.com/recipes/${recipePreview.id}/information?includeNutrition=false&apiKey=${API_KEY}`
            );
            
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error('API_AUTH_ERROR');
                } else if (response.status === 429) {
                    throw new Error('API_RATE_LIMIT');
                } else {
                    throw new Error(`Failed to fetch recipe details: ${response.status} ${response.statusText}`);
                }
            }
            
            recipeDetail = await response.json();
            console.log("Recipe detail retrieved:", recipeDetail.title);
              // Add source attribution
            const recipeSource = document.createElement('div');
            recipeSource.className = 'recipe-source';
            recipeSource.innerHTML = `<small>Recipe from: ${recipeDetail.sourceName || 'Spoonacular'}</small>`;
            
            // Add to modal
            setTimeout(() => {
                const modalContent = document.querySelector('.recipe-detail-container');
                if (modalContent && !modalContent.querySelector('.recipe-source')) {
                    modalContent.appendChild(recipeSource);
                }
            }, 100);
            
        } catch (apiError) {
            console.error("API error fetching recipe details:", apiError);
              // Note that we're using local data
            let fallbackNote = 'Using saved recipe';
            
            if (apiError.message === 'API_AUTH_ERROR') {
                fallbackNote = 'API key issue - using saved recipe';
            } else if (apiError.message === 'API_RATE_LIMIT') {
                fallbackNote = 'API limit reached - using saved recipe';
            } else {
                fallbackNote = 'Connection error - using saved recipe';
            }
            
            // Log issue
            console.warn(fallbackNote);
            
            // Fallback to mock recipe details if API fails
            recipeDetail = getMockRecipeDetail(recipePreview.id);
              // Add note about saved recipe
            setTimeout(() => {
                const modalContent = document.querySelector('.recipe-detail-container');
                if (modalContent) {
                    const demoNote = document.createElement('div');
                    demoNote.className = 'demo-note';
                    demoNote.innerHTML = '<small><i>Local recipe data</i></small>';
                    demoNote.style.fontSize = '0.8em';
                    demoNote.style.fontStyle = 'italic';
                    demoNote.style.opacity = '0.7';
                    demoNote.style.textAlign = 'right';
                    demoNote.style.marginTop = '10px';
                    modalContent.appendChild(demoNote);
                }
            }, 100);
              // Show message for connection errors only
            if (!(apiError.message === 'API_AUTH_ERROR' || apiError.message === 'API_RATE_LIMIT')) {
                addMessageToChat('bot', 'Connection issue - showing saved recipe version instead 😓');
            }
        }        // update the modal with recipe details
        document.getElementById('modal-recipe-title').textContent = recipeDetail.title;
        document.getElementById('modal-recipe-time').innerHTML = `<i class="far fa-clock"></i> ${recipeDetail.readyInMinutes} mins`;
        document.getElementById('modal-recipe-servings').innerHTML = `<i class="fas fa-utensils"></i> ${recipeDetail.servings} servings`;
        
        // Update image with fallback
        const modalImg = document.getElementById('modal-recipe-image');
        modalImg.src = recipeDetail.image;
        handleImageError(modalImg);
        
        // Add ingredients
        const ingredientsList = document.getElementById('modal-ingredients-list');
        ingredientsList.innerHTML = '';
        
        recipeDetail.extendedIngredients.forEach(ingredient => {
            const li = document.createElement('li');
            li.textContent = ingredient.original;
            ingredientsList.appendChild(li);
        });
        
        // Add instructions
        const instructionsList = document.getElementById('modal-instructions-list');
        instructionsList.innerHTML = '';
        
        if (recipeDetail.analyzedInstructions && recipeDetail.analyzedInstructions.length > 0) {
            recipeDetail.analyzedInstructions[0].steps.forEach(step => {
                const li = document.createElement('li');
                li.textContent = step.step;
                instructionsList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = "Instructions not available for this recipe.";
            instructionsList.appendChild(li);
        }
        
        // Add spice suggestion
        document.getElementById('modal-spice-suggestion').textContent = getSpiceSuggestion(recipeDetail);
          // Show the modal and scroll to top of modal content
        recipeModal.style.display = 'block';
        
        // For mobile: scroll the modal content to the top when opened
        document.querySelector('.modal-content').scrollTop = 0;
        
        // Prevent body scrolling when modal is open (helps on mobile)
        document.body.style.overflow = 'hidden';
    }
      // Generates a spice suggestion for the recipe
    function getSpiceSuggestion(recipe) {
        // My curated list of spice suggestions
        const suggestions = [
            "Try adding a pinch of smoked paprika to enhance the flavors!",
            "A dash of cumin would add warmth to this dish.",
            "Sprinkle some fresh herbs like basil or thyme right before serving.",
            "Add a pinch of cayenne pepper for a subtle heat that brings out the flavors.",
            "A little bit of nutmeg would add a wonderful depth to this recipe.",
            "Finish with some flaky sea salt and freshly cracked black pepper!",
            "Try adding a cinnamon stick during cooking for a subtle warmth.",
            "A few fennel seeds would complement these flavors beautifully.",
            "Cardamom pods would add an exotic twist to this dish!",
            "Try a splash of balsamic vinegar at the end to brighten all the flavors."
        ];
        
        // Return a random suggestion
        return suggestions[Math.floor(Math.random() * suggestions.length)];
    }
      // figures out if people want special diets
    function detectDietaryPreferences(input) {
        const preferences = {
            isVegetarian: false,
            isVegan: false,
            isGlutenFree: false,
            isDairyFree: false
        };
        
        const inputLower = input.toLowerCase();
        
        // look for keywords that indicate diet restrictions
        if (inputLower.includes('vegetarian') || inputLower.includes('no meat')) {
            preferences.isVegetarian = true;
        }
        
        if (inputLower.includes('vegan') || inputLower.includes('plant-based') || inputLower.includes('no animal')) {
            preferences.isVegan = true;
            preferences.isVegetarian = true; // Vegan is also vegetarian
        }
        
        if (inputLower.includes('gluten free') || inputLower.includes('gluten-free') || inputLower.includes('no gluten')) {
            preferences.isGlutenFree = true;
        }
        
        if (inputLower.includes('dairy free') || inputLower.includes('dairy-free') || 
            inputLower.includes('no dairy') || inputLower.includes('lactose')) {
            preferences.isDairyFree = true;
        }
        
        return preferences;
    }
      // Filters local recipe data by dietary requirements
    function filterRecipesByDiet(recipes, dietPreferences) {
        if (!Object.values(dietPreferences).some(pref => pref === true)) {
            // No filters applied
            return recipes;
        }
          // filter out recipes that don't match diet preferences
        return recipes.filter(recipe => {
            // had to hardcode this since the backup data doesn't have diet flags
            
            // Let's say Recipe 1 (Garlic Butter Chicken) contains meat, dairy
            if (recipe.id === 1) {
                if (dietPreferences.isVegetarian || dietPreferences.isVegan) return false;
                if (dietPreferences.isDairyFree) return false;
                return true;
            }
            
            // Let's say Recipe 2 (Vegetable Stir Fry) is vegan and gluten-free
            if (recipe.id === 2) {
                return true; // This passes all dietary restrictions
            }
            
            // Let's say Recipe 3 (Lemon Herb Pasta) is vegetarian but has gluten and dairy
            if (recipe.id === 3) {
                if (dietPreferences.isVegan) return false;
                if (dietPreferences.isGlutenFree) return false;
                if (dietPreferences.isDairyFree) return false;
                return true;
            }
            
            // Let's say Recipe 4 (Simple Tomato Soup) is vegetarian, dairy-free, but not gluten-free
            if (recipe.id === 4) {
                if (dietPreferences.isVegan) return true;
                if (dietPreferences.isGlutenFree) return false;
                return true;
            }
            
            return true; // Default to showing recipe if we don't have info
        });
    }
      // Fun facts for unusual ingredient combinations
    function checkForUnusualIngredients(ingredients) {
        const unusualCombos = {
            'chocolate bacon': "Chocolate and bacon? You're adventurous! Here's a wild combo: try chocolate-covered bacon with a sprinkle of sea salt. Sweet and savory! 🍫🥓",
            'peanut butter pickle': "Peanut butter and pickles? That's a bold combo! Some people swear by peanut butter and pickle sandwiches for that sweet-salty-crunchy mix! 🥜🥒",
            'watermelon feta': "Watermelon and feta is actually a fantastic combination! The sweet and salty play off each other beautifully. Add some mint for extra freshness! 🍉🧀",
            'banana ketchup': "Banana ketchup? That's actually a popular Filipino condiment! It was created during WWII when tomatoes were scarce. It's sweet and tangy! 🍌🍅"
        };
        
        const inputLower = ingredients.toLowerCase();
          // see if they mentioned any weird food combos
        for (const [combo, response] of Object.entries(unusualCombos)) {
            if (combo.split(' ').every(word => inputLower.includes(word))) {
                // wait a bit before sending the fun fact
                setTimeout(() => {
                    addMessageToChat('bot', response);
                }, 2000);
                break;
            }
        }
          // also check for weird single ingredients I know about
        const unusualSingleIngredients = {
            'durian': "Durian! The king of fruits with a... distinctive smell! 👑 Did you know hotels in Singapore often ban durians because of their powerful aroma?",
            'vegemite': "Vegemite! You must be Australian or very adventurous! 🇦🇺 It's best enjoyed as a thin scraping on buttered toast, not by the spoonful!",
            'escargot': "Escargot! Fancy some French cuisine tonight? 🐌 These snails are usually prepared with garlic butter, parsley, and sometimes a splash of cognac!",
            'haggis': "Haggis! Scotland's national dish! 🏴 Did you know traditional haggis is banned in the US because it contains sheep lung?"
        };
        
        for (const [ingredient, response] of Object.entries(unusualSingleIngredients)) {
            if (inputLower.includes(ingredient)) {
                setTimeout(() => {
                    addMessageToChat('bot', response);
                }, 2000);
                break;
            }
        }
    }
      // Tests the API connection on startup
    async function validateApiKey() {
        try {
            const testResponse = await fetch(`https://api.spoonacular.com/recipes/random?number=1&apiKey=${API_KEY}`);
            
            if (!testResponse.ok) {
                // Create appropriate message
                let errorMessage = 'Connection issue - some features will use saved data instead. 🔧';
                
                if (testResponse.status === 401 || testResponse.status === 403) {
                    errorMessage = 'API key needs updating - using saved recipes for now. 🔑';
                } else if (testResponse.status === 429) {
                    errorMessage = 'API limit reached - using saved recipes until tomorrow. 🕒';
                }
                
                // Show message
                addMessageToChat('bot', errorMessage);
                
                return false;
            }
            
            console.log('API key validation successful');
            return true;
        } catch (error) {
            console.error('API validation error:', error);
            // Show a network error message
            addMessageToChat('bot', 'Unable to connect to the recipe service. Using demo data instead. Check your internet connection. 📶');
            return false;
        }
    }
      // Check API key on startup
    validateApiKey().then(isValid => {
        if (isValid) {
            console.log("API connection successful");
            setTimeout(() => {
                addMessageToChat('bot', 'Connected to recipe database! Ready to find dishes for your ingredients! 🌟');
            }, 1000);
        } else {
            console.warn("Using local recipe data");
        }
    });
    
    // Handle window resize and orientation change
    function adjustLayoutForMobile() {
        const isMobile = window.innerWidth <= 600;
        const notebookPages = document.querySelectorAll('.notebook-page');
        
        if (isMobile) {
            // On mobile, adjust the height of the recipe page based on its content
            const rightPage = document.querySelector('.right-page');
            if (rightPage) {
                const recipesCount = document.querySelectorAll('.recipe-card').length;
                // If we have recipes, allow the container to expand
                if (recipesCount > 0) {
                    rightPage.style.maxHeight = 'none';
                    rightPage.style.height = 'auto';
                } else {
                    rightPage.style.maxHeight = '40vh';
                }
            }
            
            // Ensure chat container has appropriate height on mobile
            const leftPage = document.querySelector('.left-page');
            if (leftPage) {
                leftPage.style.maxHeight = '60vh';
            }
        } else {
            // Reset styles for desktop
            notebookPages.forEach(page => {
                page.style.maxHeight = '';
                page.style.height = '';
            });
        }
    }
    
    // Run once at startup
    adjustLayoutForMobile();
    
    // Add listeners for window resize and orientation change
    window.addEventListener('resize', adjustLayoutForMobile);
    window.addEventListener('orientationchange', adjustLayoutForMobile);
      // recipes I've saved for when the API is down
    function getMockRecipeData() {
        return [
            {
                id: 1,
                title: "Garlic Butter Chicken",
                image: "https://spoonacular.com/recipeImages/715538-312x231.jpg",
                usedIngredientCount: 3,
                missedIngredientCount: 2,
                likes: 1205
            },
            {
                id: 2,
                title: "Vegetable Stir Fry",
                image: "https://spoonacular.com/recipeImages/642605-312x231.jpg",
                usedIngredientCount: 4,
                missedIngredientCount: 0,
                likes: 934
            },
            {
                id: 3,
                title: "Lemon Herb Pasta",
                image: "https://spoonacular.com/recipeImages/716429-312x231.jpg",
                usedIngredientCount: 2,
                missedIngredientCount: 3,
                likes: 542
            },
            {
                id: 4,
                title: "Simple Tomato Soup",
                image: "https://spoonacular.com/recipeImages/716268-312x231.jpg",
                usedIngredientCount: 3,
                missedIngredientCount: 1,
                likes: 312
            }
        ];
    }      // details for my backup recipes
    function getMockRecipeDetail(id) {
        const details = {
            1: {
                id: 1,
                title: "Garlic Butter Chicken",
                readyInMinutes: 35,
                servings: 4,
                image: "https://spoonacular.com/recipeImages/715538-556x370.jpg",
                extendedIngredients: [
                    { original: "4 chicken breasts" },
                    { original: "4 tablespoons butter" },
                    { original: "6 cloves garlic, minced" },
                    { original: "1 teaspoon dried oregano" },
                    { original: "1/2 teaspoon salt" },
                    { original: "1/4 teaspoon black pepper" },
                    { original: "2 tablespoons fresh parsley, chopped" },
                    { original: "1 lemon, juiced" }
                ],
                analyzedInstructions: [
                    {
                        steps: [
                            { step: "Season chicken breasts with salt and pepper." },
                            { step: "In a large skillet, melt butter over medium heat." },
                            { step: "Add garlic to the skillet and cook for 1-2 minutes until fragrant." },
                            { step: "Add chicken to the skillet and cook for 5-7 minutes per side until golden and cooked through." },
                            { step: "Sprinkle with oregano and cook for another minute." },
                            { step: "Remove from heat, squeeze lemon juice over chicken, and garnish with parsley before serving." }
                        ]
                    }
                ]
            },
            2: {
                id: 2,
                title: "Vegetable Stir Fry",
                readyInMinutes: 20,
                servings: 3,
                image: "https://spoonacular.com/recipeImages/642605-556x370.jpg",
                extendedIngredients: [
                    { original: "2 cups broccoli florets" },
                    { original: "1 red bell pepper, sliced" },
                    { original: "1 carrot, julienned" },
                    { original: "1 cup snap peas" },
                    { original: "3 tablespoons soy sauce" },
                    { original: "1 tablespoon sesame oil" },
                    { original: "2 cloves garlic, minced" },
                    { original: "1 teaspoon ginger, grated" },
                    { original: "2 tablespoons vegetable oil" }
                ],
                analyzedInstructions: [
                    {
                        steps: [
                            { step: "Heat vegetable oil in a wok or large skillet over high heat." },
                            { step: "Add garlic and ginger, stir for 30 seconds until fragrant." },
                            { step: "Add vegetables and stir-fry for 5-7 minutes until tender-crisp." },
                            { step: "Add soy sauce and sesame oil, toss to combine." },
                            { step: "Serve immediately over rice if desired." }
                        ]
                    }
                ]
            },
            3: {
                id: 3,
                title: "Lemon Herb Pasta",
                readyInMinutes: 25,
                servings: 4,
                image: "https://spoonacular.com/recipeImages/716429-556x370.jpg",
                extendedIngredients: [
                    { original: "8 oz spaghetti or linguine" },
                    { original: "3 tablespoons olive oil" },
                    { original: "2 cloves garlic, minced" },
                    { original: "Zest and juice of 1 lemon" },
                    { original: "1/4 cup fresh parsley, chopped" },
                    { original: "2 tablespoons fresh basil, chopped" },
                    { original: "1/4 cup grated Parmesan cheese" },
                    { original: "Salt and pepper to taste" },
                    { original: "Red pepper flakes (optional)" }
                ],
                analyzedInstructions: [
                    {
                        steps: [
                            { step: "Cook pasta according to package directions. Reserve 1/2 cup of pasta water before draining." },
                            { step: "In a large skillet, heat olive oil over medium heat. Add garlic and cook for 1 minute." },
                            { step: "Add lemon zest and juice, stir to combine." },
                            { step: "Add drained pasta to the skillet and toss to coat. Add pasta water a little at a time if needed for consistency." },
                            { step: "Remove from heat, stir in herbs and Parmesan cheese." },
                            { step: "Season with salt, pepper, and red pepper flakes if desired." }
                        ]
                    }
                ]
            },
            4: {
                id: 4,
                title: "Simple Tomato Soup",
                readyInMinutes: 30,
                servings: 4,
                image: "https://spoonacular.com/recipeImages/716268-556x370.jpg",
                extendedIngredients: [
                    { original: "2 tablespoons olive oil" },
                    { original: "1 onion, chopped" },
                    { original: "2 cloves garlic, minced" },
                    { original: "2 tablespoons tomato paste" },
                    { original: "2 cans (28 oz each) whole peeled tomatoes" },
                    { original: "2 cups vegetable broth" },
                    { original: "1 teaspoon sugar" },
                    { original: "1/4 cup fresh basil leaves" },
                    { original: "Salt and pepper to taste" },
                    { original: "1/2 cup heavy cream (optional)" }
                ],
                analyzedInstructions: [
                    {
                        steps: [
                            { step: "Heat olive oil in a large pot over medium heat. Add onion and cook until soft, about 5 minutes." },
                            { step: "Add garlic and cook for 30 seconds until fragrant." },
                            { step: "Stir in tomato paste and cook for 1-2 minutes." },
                            { step: "Add canned tomatoes (with juice), vegetable broth, and sugar. Break up tomatoes with a spoon." },
                            { step: "Bring to a boil, then reduce heat and simmer for 15 minutes." },
                            { step: "Add basil leaves and use an immersion blender to puree until smooth (or transfer in batches to a regular blender)." },
                            { step: "Season with salt and pepper to taste. If using, stir in cream before serving." }
                        ]
                    }
                ]
            }
        };
        
        return details[id] || details[1]; // Default to first recipe if ID not found
    }
    
    // Initial setup
    setupImageErrorHandling();
});
