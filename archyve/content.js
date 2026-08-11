
window.addEventListener('load', function () {
    const pageContent = document.body.innerHTML.toLowerCase();

    
    if (pageContent.includes("openresty") || pageContent.includes("site not found")) {
    
        const fallbackUrl = 'https://www.betterworkai.org/blogs/ois/#';  
        window.location.href = fallbackUrl;
    }
});
