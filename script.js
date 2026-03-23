const container = document.getElementById("pokemon-container");
const searchInput = document.getElementById("search");

const overlay = document.getElementById("overlay");
const overlayContent = overlay.querySelector(".overlay-content");
const closeBtn = overlay.querySelector(".close-btn");

let allPokemons = [];
let offset = 0;
const limit = 50;
let isLoading = false;
let searchAbortController = null;
let frenchToEnglish = {};

fetch("french-to-english.json")
  .then((res) => res.json())
  .then((data) => {
    frenchToEnglish = data;
    console.log("Dictionnaire français → anglais chargé !");
  })
  .catch((err) => console.error("Erreur chargement JSON:", err));

// Convertir les noms
function getEnglishName(frenchName) {
  // Casse ignorée
  const formattedName =
    frenchName.charAt(0).toUpperCase() + frenchName.slice(1).toLowerCase();
  return frenchToEnglish[formattedName] || frenchName;
}

// Debounced function for search
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Mapping pour les abréviations des stats
const statAbbreviations = {
  attack: "Atk",
  defense: "Def",
  "special-attack": "SpA",
  "special-defense": "SpD",
  speed: "Spe",
};

// Mapping pour les icônes de type
const typeImages = {
  normal:
    "https://raw.githubusercontent.com/partywhale/pokemon-type-icons/fcbe6978c61c359680bc07636c3f9bdc0f346b43/icons/normal.svg",
  fire: "https://raw.githubusercontent.com/partywhale/pokemon-type-icons/fcbe6978c61c359680bc07636c3f9bdc0f346b43/icons/fire.svg",
  water:
    "https://raw.githubusercontent.com/partywhale/pokemon-type-icons/fcbe6978c61c359680bc07636c3f9bdc0f346b43/icons/water.svg",
  grass:
    "https://raw.githubusercontent.com/partywhale/pokemon-type-icons/fcbe6978c61c359680bc07636c3f9bdc0f346b43/icons/grass.svg",
  flying:
    "https://raw.githubusercontent.com/partywhale/pokemon-type-icons/fcbe6978c61c359680bc07636c3f9bdc0f346b43/icons/flying.svg",
  fighting:
    "https://raw.githubusercontent.com/partywhale/pokemon-type-icons/fcbe6978c61c359680bc07636c3f9bdc0f346b43/icons/fighting.svg",
  poison:
    "https://raw.githubusercontent.com/partywhale/pokemon-type-icons/fcbe6978c61c359680bc07636c3f9bdc0f346b43/icons/poison.svg",
  electric:
    "https://raw.githubusercontent.com/partywhale/pokemon-type-icons/fcbe6978c61c359680bc07636c3f9bdc0f346b43/icons/electric.svg",
  ground:
    "https://raw.githubusercontent.com/partywhale/pokemon-type-icons/fcbe6978c61c359680bc07636c3f9bdc0f346b43/icons/ground.svg",
  rock: "https://raw.githubusercontent.com/partywhale/pokemon-type-icons/fcbe6978c61c359680bc07636c3f9bdc0f346b43/icons/rock.svg",
  psychic:
    "https://raw.githubusercontent.com/partywhale/pokemon-type-icons/fcbe6978c61c359680bc07636c3f9bdc0f346b43/icons/psychic.svg",
  ice: "https://raw.githubusercontent.com/partywhale/pokemon-type-icons/fcbe6978c61c359680bc07636c3f9bdc0f346b43/icons/ice.svg",
  bug: "https://raw.githubusercontent.com/partywhale/pokemon-type-icons/fcbe6978c61c359680bc07636c3f9bdc0f346b43/icons/bug.svg",
  ghost:
    "https://raw.githubusercontent.com/partywhale/pokemon-type-icons/fcbe6978c61c359680bc07636c3f9bdc0f346b43/icons/ghost.svg",
  steel:
    "https://raw.githubusercontent.com/partywhale/pokemon-type-icons/refs/heads/main/icons/steel.svg",
  dragon:
    "https://raw.githubusercontent.com/partywhale/pokemon-type-icons/fcbe6978c61c359680bc07636c3f9bdc0f346b43/icons/dragon.svg",
  dark: "https://raw.githubusercontent.com/partywhale/pokemon-type-icons/fcbe6978c61c359680bc07636c3f9bdc0f346b43/icons/dark.svg",
  fairy:
    "https://raw.githubusercontent.com/partywhale/pokemon-type-icons/fcbe6978c61c359680bc07636c3f9bdc0f346b43/icons/fairy.svg",
};

// Charge un "batch" de Pokémon depuis l'API
async function loadPokemonBatch() {
  if (isLoading) return;
  isLoading = true;

  try {
    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon?offset=${offset}&limit=${limit}`,
    );
    if (!response.ok) throw new Error("Failed to fetch Pokemon list");
    const data = await response.json();

    const promises = data.results.map(async (p) => {
      try {
        const urlParts = p.url.split("/");
        const pokemonId = urlParts[urlParts.length - 2];

        const detailsResp = await fetch(
          `https://pokeapi.co/api/v2/pokemon/${pokemonId}`,
        );
        if (!detailsResp.ok) throw new Error("Pokemon details not found");
        const details = await detailsResp.json();

        const sprite = details.sprites?.front_default;
        if (!sprite) return null;

        // Nom français depuis le dictionnaire
        const frenchName =
          Object.keys(frenchToEnglish).find(
            (fr) =>
              frenchToEnglish[fr].toLowerCase() === details.name.toLowerCase(),
          ) || details.name.charAt(0).toUpperCase() + details.name.slice(1);

        // Description française vide (ou à récupérer si tu veux plus tard)
        const frFlavorText = "";

        return {
          id: details.id,
          englishName: details.name.toLowerCase(),
          frenchName,
          frFlavorText,
          types: details.types?.map((t) => t.type.name) || [],
          stats: details.stats || [],
          sprite,
        };
      } catch (err) {
        console.error("Error processing Pokemon:", err);
        return null;
      }
    });

    const pokemons = (await Promise.all(promises)).filter((p) => p !== null);
    allPokemons.push(...pokemons);
    displayPokemon(pokemons);

    offset += limit;
  } catch (err) {
    console.error("Error loading Pokemon batch:", err);
  } finally {
    isLoading = false;
  }
}

// Fonction pour créer la carte d'un Pokémon
function createPokemonCard(data) {
  try {
    const card = document.createElement("div");
    card.classList.add("pokemon-card");

    // Création de card-inner
    const cardInner = document.createElement("div");
    cardInner.classList.add("card-inner");

    // Header
    const header = document.createElement("div");
    header.classList.add("card-header");
    const hpStat = data.stats.find((s) => s.stat.name === "hp");
    const hpValue = hpStat ? hpStat.base_stat : 0;
    header.innerHTML = `
      <span class="name">${data.frenchName}</span>
      <span class="hp">HP: ${hpValue}</span>
      <img src="${typeImages[data.types[0]]}" class="type-icon-img" />
    `;
    cardInner.appendChild(header);

    // Image
    const imgDiv = document.createElement("div");
    imgDiv.classList.add("card-image");
    const img = document.createElement("img");
    img.src = data.sprite;
    img.alt = data.englishName;
    img.onerror = () => (img.src = "");
    imgDiv.appendChild(img);
    cardInner.appendChild(imgDiv);

    // Stats
    const infoDiv = document.createElement("div");
    infoDiv.classList.add("card-info");
    infoDiv.innerHTML = data.stats
      .filter((stat) => stat.stat.name !== "hp")
      .map((stat) => {
        const widthPercent = Math.min((stat.base_stat / 150) * 100, 100);
        const statInitial = statAbbreviations[stat.stat.name] || stat.stat.name;
        const fillColor = stat.base_stat > 100 ? "#e74c3c" : "#363a3a";
        return `
          <div class="stat-bar">
            <span class="stat-name">${statInitial}</span>
            <div class="stat-fill" style="width: ${widthPercent}%; background-color: ${fillColor}"></div>
            <div class="stat-number">${stat.base_stat}</div>
          </div>
        `;
      })
      .join("");
    cardInner.appendChild(infoDiv);

    card.appendChild(cardInner);

    // Ajout du clic sur la carte
    cardInner.addEventListener("click", () => openOverlay(data));

    // Dégradé selon les types
    const type1 = data.types[0] || "normal";
    const type2 = data.types[1];
    if (type2) {
      cardInner.style.background = `linear-gradient(135deg, var(--${type1}), var(--${type2}))`;
    } else {
      cardInner.style.background = `linear-gradient(135deg, var(--${type1}), #ffffff)`;
    }

    container.appendChild(card);
  } catch (err) {
    console.error("Error creating Pokemon card:", err);
  }
}

// Affiche plusieurs Pokémon
function displayPokemon(pokemons) {
  for (const p of pokemons) {
    createPokemonCard(p);
  }
}

// Scroll infini
window.addEventListener("scroll", () => {
  const scrollPosition = window.innerHeight + window.scrollY;
  const pageHeight = document.documentElement.scrollHeight;

  if (scrollPosition >= pageHeight - 300) {
    loadPokemonBatch();
  }
});

// Debounced search function
const debouncedSearch = debounce(async (value) => {
  if (searchAbortController) {
    searchAbortController.abort();
  }
  searchAbortController = new AbortController();

  try {
    container.innerHTML = "";

    if (!value) {
      displayPokemon(allPokemons);
      return;
    }

    const searchValue = value.toLowerCase();

    // Filtrer les Pokémon déjà chargés
    let filtered = allPokemons.filter(
      (p) =>
        p.frenchName.toLowerCase().startsWith(searchValue) ||
        p.englishName.toLowerCase().startsWith(searchValue),
    );

    if (filtered.length === 0) {
      try {
        // Convertir nom français en anglais si besoin
        const englishName =
          Object.entries(frenchToEnglish).find(
            ([fr, en]) => fr.toLowerCase() === searchValue,
          )?.[1] || value;

        const response = await fetch(
          `https://pokeapi.co/api/v2/pokemon/${englishName.toLowerCase()}`,
          { signal: searchAbortController.signal },
        );
        if (!response.ok) throw new Error("Pokémon non trouvé");

        const details = await response.json();
        const sprite = details.sprites?.front_default;
        if (!sprite) {
          displayNotFound();
          return;
        }

        const frenchName =
          Object.keys(frenchToEnglish).find(
            (fr) =>
              frenchToEnglish[fr].toLowerCase() === details.name.toLowerCase(),
          ) || details.name.charAt(0).toUpperCase() + details.name.slice(1);

        const pokemonData = {
          id: details.id,
          englishName: details.name.toLowerCase(),
          frenchName: frenchName,
          types: details.types?.map((t) => t.type.name) || [],
          stats: details.stats || [],
          sprite: sprite,
        };

        createPokemonCard(pokemonData);
        if (!allPokemons.some((p) => p.id === pokemonData.id)) {
          allPokemons.push(pokemonData);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Search error:", err);
          displayNotFound();
        }
      }
    } else {
      displayPokemon(filtered);
    }
  } catch (err) {
    console.error("Error in search:", err);
  }
}, 300);

// Fonction pour afficher un Pokémon non trouvé proprement
function displayNotFound() {
  const card = document.createElement("div");
  card.classList.add("card-inner");
  const header = document.createElement("div");
  header.classList.add("card-header");
  header.textContent = "Pokémon non trouvé";
  card.appendChild(header);
  container.appendChild(card);
}

// Recherche par nom français avec debounce
searchInput.addEventListener("input", (e) => {
  const value = e.target.value.trim().toLowerCase();
  debouncedSearch(value);
});

// Générer le HTML de la carte dans l'overlay
function openOverlay(data) {
  try {
    const hpStat = data.stats.find((stat) => stat.stat.name === "hp");
    const hp = hpStat ? hpStat.base_stat : 0;
    const firstType = data.types[0] || "normal";

    const statsHTML = data.stats
      .filter((stat) => stat.stat.name !== "hp")
      .map((stat) => {
        const widthPercent = Math.min((stat.base_stat / 150) * 100, 100);
        const statInitial = statAbbreviations[stat.stat.name] || stat.stat.name;
        const fillColor = stat.base_stat > 100 ? "#e74c3c" : "#363a3a";
        return `
          <div class="stat-bar">
            <span class="stat-name">${statInitial}</span>
            <div class="stat-fill" style="width: ${widthPercent}%; background-color: ${fillColor}"></div>
            <div class="stat-number">${stat.base_stat}</div>
          </div>
        `;
      })
      .join("");

    const secondType = data.types[1] ? `var(--${data.types[1]})` : "#ffffff";
    overlayContent.innerHTML = `
      <div class="overlay-card-inner" style="background: linear-gradient(135deg, var(--${firstType}), ${secondType})">
        <div class="card-header">
          <span class="name">${data.frenchName}</span>
          <span class="hp">HP: ${hp}</span>
          <img src="${typeImages[firstType]}" class="type-icon-img">
        </div>
        <div class="card-image">
          <img src="${data.sprite}" alt="${data.englishName}">
        </div>
        <div class="card-info">
          <p class="stats">${statsHTML}</p>
          <div class="flavor-text">${data.frFlavorText || "Description non disponible"}</div>
        </div>
      </div>
    `;

    overlay.classList.add("active");
  } catch (err) {
    console.error("Error opening overlay:", err);
  }
}

// Fermer l'overlay
closeBtn.addEventListener("click", () => {
  overlay.classList.remove("active");
});

// Fermer en cliquant sur le fond
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) overlay.classList.remove("active");
});

// Chargement initial
(async () => {
  searchInput.disabled = true;
  await loadPokemonBatch(); // Charge le premier batch
  searchInput.disabled = false;
})();
