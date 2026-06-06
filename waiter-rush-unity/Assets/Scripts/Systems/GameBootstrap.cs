using UnityEngine;

namespace WaiterRush
{
    // Liga os botoes dos paineis (Comecar / Proximo / Reiniciar) ao GameManager.
    // Coloque este componente num GameObject da cena e arraste as referencias.
    public class GameBootstrap : MonoBehaviour
    {
        public GameManager game;
        public TrayController tray;
        public HUDManager hud;
        public GameObject panelStart;

        // Botao "COMECAR"
        public void OnStart()
        {
            if (panelStart) panelStart.SetActive(false);
            tray.Recalibrate();          // calibra a postura neutra do celular
            game.StartLevel(1);
        }

        // Botao "PROXIMO NIVEL"
        public void OnNextLevel()
        {
            if (hud.panelLevelUp) hud.panelLevelUp.SetActive(false);
            game.StartLevel(game.LevelNum + 1);
        }

        // Botoes "TENTAR NOVAMENTE" / "JOGAR DE NOVO"
        public void OnRestart()
        {
            if (hud.panelGameOver) hud.panelGameOver.SetActive(false);
            if (hud.panelWin) hud.panelWin.SetActive(false);
            // recarrega a cena para zerar tudo
            UnityEngine.SceneManagement.SceneManager.LoadScene(
                UnityEngine.SceneManagement.SceneManager.GetActiveScene().buildIndex);
        }

        // Botao de recalibrar sensores (engrenagem)
        public void OnRecalibrate() => tray.Recalibrate();
    }
}
