import React, { useEffect } from 'react';

const Home = () => {
    useEffect(() => {
        console.info('[Minitiger Web] Native Home PoC mounted');
    }, []);

    return (
        <main
            id='minitigerNativeHome'
            style={{
                minHeight: '100vh',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                background: '#111318',
                color: '#ffffff'
            }}
        >
            <div
                style={{
                    maxWidth: '760px',
                    width: '100%',
                    textAlign: 'center'
                }}
            >
                <div
                    style={{
                        fontSize: '5rem',
                        marginBottom: '1rem'
                    }}
                >
                    🐯
                </div>

                <h1
                    style={{
                        fontSize: '3rem',
                        margin: '0 0 1rem'
                    }}
                >
                    Minitiger Web
                </h1>

                <p
                    style={{
                        fontSize: '1.4rem',
                        opacity: 0.8,
                        margin: 0
                    }}
                >
                    Native Home Renderer läuft.
                </p>

                <p
                    style={{
                        marginTop: '2rem',
                        opacity: 0.5
                    }}
                >
                    Proof of Concept · Jellyfin Web 12.0
                </p>
            </div>
        </main>
    );
};

export default Home;
