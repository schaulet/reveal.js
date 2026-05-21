//! Reveal.js Presenter - Dioxus Desktop Application
//! A pure Rust application for viewing reveal.js presentations

use dioxus::prelude::*;
use dioxus_desktop::{Config, LogicalSize, WindowBuilder};

fn main() {
    // Initialize logger
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .init();
    
    println!("🚀 Starting Reveal.js Presenter (Dioxus)...");
    
    dioxus::LaunchBuilder::new()
        .with_cfg(desktop_config)
        .launch();
}

fn desktop_config() -> Config {
    Config::new()
        .with_window(WindowBuilder::new()
            .with_title("Reveal.js Presenter")
            .with_inner_size(LogicalSize::new(1024.0, 768.0))
            .with_min_inner_size(LogicalSize::new(800.0, 600.0))
            .with_resizable(true))
}

/// Application state - stores current presentation
#[derive(Default)]
struct AppState {
    /// Currently loaded file path
    current_file: String,
    /// All slides in the presentation
    slides: Vec<Slide>,
    /// Current theme
    theme: String,
    /// Current slide index
    current_index: usize,
}

impl AppState {
    fn new() -> Self {
        Self {
            current_file: String::new(),
            slides: vec![Slide::default()],
            theme: "black".to_string(),
            current_index: 0,
        }
    }
}

/// A single slide in the presentation
#[derive(Default, Clone)]
struct Slide {
    title: String,
    content: String,
    background_color: String,
    transition: String,
}

mod app_ui {
    use super::*;
    
    /// Main application component
    #[component]
    pub fn App() -> Element {
        let mut state = use_context_provider(|| Signal::new(AppState::new()));
        
        rsx! {
            div {
                class: "app-container",
                
                // Header with toolbar
                header {
                    class: "toolbar",
                    
                    // File menu
                    div { class: "menu-group",
                        button { onclick: |_| new_presentation(&mut state), "📄 Nouveau" }
                        button { onclick: |_| open_presentation(&mut state), "📂 Ouvrir" }
                        button { onclick: |_| import_pptx(&mut state), "📥 Importer PPTX" }
                        button { onclick: |_| save_presentation(&state), "💾 Enregistrer" }
                    }
                    
                    // Theme selector
                    div { class: "theme-group",
                        select {
                            onchange: |evt| state.with(|s| s.theme = evt.value()),
                            option { value: "black", "Black" }
                            option { value: "white", "White" }
                            option { value: "league", "League" }
                            option { value: "beige", "Beige" }
                            option { value: "night", "Night" }
                        }
                    }
                    
                    // Fullscreen button
                    div { class: "action-group",
                        button { onclick: |_| toggle_fullscreen(), "🖥️ Plein écran (F11)" }
                        button { onclick: |_| launch_presentation(&state), "▶️ Lancer (F5)" }
                    }
                }
                
                // Main content area
                div { class: "main-content",
                    
                    // Sidebar - slide list
                    aside { class: "sidebar",
                        div { class: "slide-list-title", "Diapositives" }
                        
                        for (idx, slide) in state.read().slides.iter().enumerate() {
                            div {
                                class: if idx == state.read().current_index { "slide-item active" } else { "slide-item" },
                                onclick: move |_| state.with(|s| s.current_index = idx),
                                
                                div { class: "slide-number", "{idx + 1}" }
                                div { class: "slide-title", "{slide.title}" }
                            }
                        }
                        
                        button { 
                            class: "add-slide-btn",
                            onclick: |_| add_slide(&mut state),
                            "➕ Ajouter une diapositive"
                        }
                    }
                    
                    // Editor area
                    div { class: "editor-area",
                        textarea {
                            class: "content-editor",
                            value: "{state.read().slides.get(state.read().current_index).map(|s| s.content.clone()).unwrap_or_default()}",
                            oninput: |evt| {
                                if let Some(slide) = state.write().slides.get_mut(state.read().current_index) {
                                    slide.content = evt.value();
                                }
                            },
                            placeholder: "Entrez le contenu en Markdown..."
                        }
                    }
                }
                
                // Status bar
                footer {
                    class: "status-bar",
                    span { "Diapositive {state.read().current_index + 1} sur {state.read().slides.len()}" }
                    span { "Thème: {state.read().theme}" }
                }
            }
        }
    }
    
    // File actions
    fn new_presentation(state: &Signal<AppState>) {
        println!("📄 Creating new presentation...");
        state.write().slides = vec![Slide::default()];
        state.write().current_index = 0;
        state.write().current_file.clear();
    }
    
    fn open_presentation(state: &Signal<AppState>) {
        println!("📂 Opening presentation...");
        // Would use rfd crate for file dialog
    }
    
    fn import_pptx(state: &Signal<AppState>) {
        println!("📥 Importing PPTX...");
        // Would convert PPTX to slides
    }
    
    fn save_presentation(state: &Signal<AppState>) {
        println!("💾 Saving presentation...");
        // Would save markdown or HTML
    }
    
    fn add_slide(state: &Signal<AppState>) {
        println!("➕ Adding new slide...");
        state.write().slides.push(Slide::default());
    }
    
    fn toggle_fullscreen() {
        println!("🖥️ Toggling fullscreen...");
        // Would use dioxusDesktop window API
    }
    
    fn launch_presentation(state: &Signal<AppState>) {
        println!("▶️ Launching presentation in fullscreen...");
        // Would show fullscreen presentation view
    }
}

/// Component for rendering in presentation mode
#[component]
pub fn PresentationView() -> Element {
    let mut state = use_context_provider(|| Signal::new(AppState::new()));
    
    rsx! {
        div { class: "reveal",
            div { class: "slides",
                for (idx, slide) in state.read().slides.iter().enumerate() {
                    section {
                        class: if idx == state.read().current_index { "present" } else { "" },
                        data_background: "{slide.background_color}",
                        data_transition: "{slide.transition}",
                        
                        h2 { "{slide.title}" }
                        p { "{slide.content}" }
                    }
                }
            }
        }
    }
}

/// Slide editor component
#[component]
pub fn SlideEditor(slide: Slide) -> Element {
    let mut title = use_signal(|| slide.title.clone());
    let mut content = use_signal(|| slide.content.clone());
    let mut bg_color = use_signal(|| slide.background_color.clone());
    let mut transition = use_signal(|| slide.transition.clone());
    
    rsx! {
        div { class: "slide-editor",
            div { class: "slide-properties",
                label { "Titre:" }
                input { 
                    value: "{title}",
                    oninput: |evt| title.set(evt.value()),
                }
                
                label { "Couleur de fond:" }
                input { 
                    r#type: "color",
                    value: "{bg_color}",
                    oninput: |evt| bg_color.set(evt.value()),
                }
                
                label { "Transition:" }
                select {
                    value: "{transition}",
                    onchange: |evt| transition.set(evt.value()),
                    option { value: "", "Aucune" }
                    option { value: "slide", "Slide" }
                    option { value: "fade", "Fade" }
                    option { value: "zoom", "Zoom" }
                    option { value: "convex", "Convex" }
                    option { value: "concave", "Concave" }
                }
            }
            
            textarea {
                class: "slide-content",
                value: "{content}",
                oninput: |evt| content.set(evt.value()),
                placeholder: "Contenu de la diapositive (Markdown)...",
            }
        }
    }
}