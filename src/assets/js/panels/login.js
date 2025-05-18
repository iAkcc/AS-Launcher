/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */
const { AZauth, Mojang } = require('minecraft-java-core');
const { ipcRenderer } = require('electron');

import { popup, database, changePanel, accountSelect, addAccount, config, setStatus } from '../utils.js';

class Login {
    static id = "login";
    async init(config) {
        this.config = config;
        this.db = new database();

        // Panel Elements
        this.loginSelectionPanel = document.querySelector('.login-selection');
        this.loginHomePanel = document.querySelector('.login-home'); // Premium/Online
        this.loginOfflinePanel = document.querySelector('.login-offline'); // No Premium
        this.loginAZauthPanel = document.querySelector('.login-AZauth');
        this.loginAZauthA2FPanel = document.querySelector('.login-AZauth-A2F');

        // Selection Buttons
        this.showOfflineBtn = document.getElementById('show-offline-login-btn');
        this.showPremiumBtn = document.getElementById('show-premium-login-btn');
        this.showAZauthBtn = document.getElementById('show-azauth-login-btn');

        // Back/Cancel Buttons
        this.backToSelectionBtns = document.querySelectorAll('.cancel-to-selection');
        this.cancelAZauthA2FBtn = document.querySelector('.login-AZauth-A2F .cancel-to-azauth'); // Specific to A2F panel

        // Initialize login methods (sets up listeners but doesn't show panels)
        this.getMicrosoft(); // For Premium/Online via login-home panel
        this.getCrack();     // For Offline/No Premium via login-offline panel
        this.getAZauth();    // For AZAuth via login-AZauth panel

        this.setupNavigation();
        this.showPanel(this.loginSelectionPanel); // Show selection panel by default

        // Handle the global cancel button (if it exists, typically shown by settings.js)
        const globalCancelButton = document.querySelector('.cancel-home');
        if (globalCancelButton) {
            globalCancelButton.addEventListener('click', () => {
                globalCancelButton.style.display = 'none';
                changePanel('settings');
            });
        }
    }

    showPanel(panelToShow) {
        // Hide all panels
        [this.loginSelectionPanel, this.loginHomePanel, this.loginOfflinePanel, this.loginAZauthPanel, this.loginAZauthA2FPanel].forEach(panel => {
            if (panel) panel.style.display = 'none';
        });

        // Show the target panel
        if (panelToShow) {
            panelToShow.style.display = 'block'; // Or 'flex' if your CSS uses that
        }
    }

    setupNavigation() {
        this.showOfflineBtn.addEventListener('click', () => this.showPanel(this.loginOfflinePanel));
        this.showPremiumBtn.addEventListener('click', () => this.showPanel(this.loginHomePanel));
        this.showAZauthBtn.addEventListener('click', () => this.showPanel(this.loginAZauthPanel));

        this.backToSelectionBtns.forEach(button => {
            button.addEventListener('click', () => this.showPanel(this.loginSelectionPanel));
        });

        // Specific cancel for A2F panel to go back to AZAuth email/password
        if (this.cancelAZauthA2FBtn) {
            this.cancelAZauthA2FBtn.addEventListener('click', () => this.showPanel(this.loginAZauthPanel));
        }
    }

    async getMicrosoft() {
        console.log('Initializing Microsoft login...');
        let popupLogin = new popup();
        // Panel visibility is now handled by showPanel()
        // let loginHome = document.querySelector('.login-home');
        let microsoftBtn = document.querySelector('.login-home .connect-home');
        // loginHome.style.display = 'block'; // REMOVED

        microsoftBtn.addEventListener("click", async () => { // Added async
            popupLogin.openPopup({
                title: 'Connexion',
                content: 'Veuillez patienter...',
                color: 'var(--color)'
            });

            ipcRenderer.invoke('Microsoft-window', this.config.client_id).then(async account_connect => {
                if (account_connect == 'cancel' || !account_connect) {
                    popupLogin.closePopup();
                    return;
                } else {
                    await this.saveData(account_connect)
                    popupLogin.closePopup();
                }

            }).catch(err => {
                popupLogin.openPopup({
                    title: 'Erreur',
                    content: err,
                    options: true
                });
            });
        })
    }

    async getCrack() {
        console.log('Initializing offline login...');
        let popupLogin = new popup();
        // Panel visibility is now handled by showPanel()
        // let loginOffline = document.querySelector('.login-offline');
        let emailOffline = document.querySelector('.login-offline .email-offline');
        let connectOffline = document.querySelector('.login-offline .connect-offline');
        // loginOffline.style.display = 'block'; // REMOVED
        connectOffline.addEventListener('click', async () => {
            if (emailOffline.value.length < 3) {
                popupLogin.openPopup({
                    title: 'Erreur',
                    content: 'Votre pseudo doit faire au moins 3 caractères.',
                    options: true
                });
                return;
            }

            if (emailOffline.value.match(/ /g)) {
                popupLogin.openPopup({
                    title: 'Erreur',
                    content: 'Votre pseudo ne doit pas contenir d\'espaces.',
                    options: true
                });
                return;
            }

            let MojangConnect = await Mojang.login(emailOffline.value);

            if (MojangConnect.error) {
                popupLogin.openPopup({
                    title: 'Erreur',
                    content: MojangConnect.message,
                    options: true
                });
                return;
            }
            await this.saveData(MojangConnect)
            popupLogin.closePopup();
        });
    }

    async getAZauth() {
        console.log('Initializing AZauth login...');
        let AZauthClient = new AZauth(this.config.online);
        let PopupLogin = new popup();
        // Panel visibility is now handled by showPanel()
        // let loginAZauth = document.querySelector('.login-AZauth');
        // let loginAZauthA2F = document.querySelector('.login-AZauth-A2F');

        let AZauthEmail = document.querySelector('.login-AZauth .email-AZauth');
        let AZauthPassword = document.querySelector('.login-AZauth .password-AZauth');
        let AZauthA2FInput = document.querySelector('.login-AZauth-A2F .A2F-AZauth'); // Renamed to avoid conflict
        let connectAZauthA2F = document.querySelector('.login-AZauth-A2F .connect-AZauth-A2F');
        let AZauthConnectBTN = document.querySelector('.login-AZauth .connect-AZauth');
        // let AZauthCancelA2F = document.querySelector('.login-AZauth-A2F .cancel-AZauth-A2F'); // Handled by this.cancelAZauthA2FBtn

        // loginAZauth.style.display = 'block'; // REMOVED
        AZauthConnectBTN.addEventListener('click', async () => {
            PopupLogin.openPopup({
                title: 'Connexion en cours...',
                content: 'Veuillez patienter...',
                color: 'var(--color)'
            });

            if (AZauthEmail.value == '' || AZauthPassword.value == '') {
                PopupLogin.openPopup({
                    title: 'Erreur',
                    content: 'Veuillez remplir tous les champs.',
                    options: true
                });
                return;
            }

            let AZauthConnect = await AZauthClient.login(AZauthEmail.value, AZauthPassword.value);

            if (AZauthConnect.error) {
                PopupLogin.openPopup({
                    title: 'Erreur',
                    content: AZauthConnect.message,
                    options: true
                });
                return;
            } else if (AZauthConnect.A2F) {
                this.showPanel(this.loginAZauthA2FPanel); // Show A2F panel
                PopupLogin.closePopup();

                // Event listener for AZauthCancelA2FBtn is set in setupNavigation()
                connectAZauthA2F.addEventListener('click', async () => {
                    PopupLogin.openPopup({
                        title: 'Connexion en cours...',
                        content: 'Veuillez patienter...',
                        color: 'var(--color)'
                    });

                    if (AZauthA2FInput.value == '') {
                        PopupLogin.openPopup({
                            title: 'Erreur',
                            content: 'Veuillez entrer le code A2F.',
                            options: true
                        });
                        return;
                    }

                    AZauthConnect = await AZauthClient.login(AZauthEmail.value, AZauthPassword.value, AZauthA2FInput.value);

                    if (AZauthConnect.error) {
                        PopupLogin.openPopup({
                            title: 'Erreur',
                            content: AZauthConnect.message,
                            options: true
                        });
                        return;
                    }

                    await this.saveData(AZauthConnect)
                    PopupLogin.closePopup();
                });
            } else if (!AZauthConnect.A2F) {
                await this.saveData(AZauthConnect)
                PopupLogin.closePopup();
            }
        });
    }

    async saveData(connectionData) {
        let configClient = await this.db.readData('configClient');
        let account = await this.db.createData('accounts', connectionData)
        let instanceSelect = configClient.instance_selct
        let instancesList = await config.getInstanceList()
        configClient.account_selected = account.ID;

        for (let instance of instancesList) {
            if (instance.whitelistActive) {
                let whitelist = instance.whitelist.find(whitelist => whitelist == account.name)
                if (whitelist !== account.name) {
                    if (instance.name == instanceSelect) {
                        let newInstanceSelect = instancesList.find(i => i.whitelistActive == false)
                        configClient.instance_selct = newInstanceSelect.name
                        await setStatus(newInstanceSelect.status)
                    }
                }
            }
        }

        await this.db.updateData('configClient', configClient);
        await addAccount(account);
        await accountSelect(account);
        changePanel('home');
    }
}
export default Login;