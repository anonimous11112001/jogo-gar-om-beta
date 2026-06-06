using UnityEngine;

namespace WaiterRush
{
    // Movimento do garcom por joystick virtual + camera em terceira pessoa.
    // Animacoes Idle/Walk/Run via Animator (parametros "Speed" e "Running").
    [RequireComponent(typeof(CharacterController))]
    public class PlayerController : MonoBehaviour
    {
        public VirtualJoystick joystick;
        public Transform cameraRig;        // pivot da camera atras do garcom
        public Animator animator;          // opcional
        public Transform trayAnchor;       // mao que segura a bandeja

        [Header("Camera")]
        public float camDistance = 5.2f;
        public float camHeight = 3.4f;
        public float camLerp = 0.12f;

        CharacterController cc;
        GameConfig cfg => GameManager.Instance.config;
        float heading = Mathf.PI;
        Vector3 velocity;

        void Awake() => cc = GetComponent<CharacterController>();

        void Update()
        {
            if (!GameManager.Instance.Running) return;

            Vector2 input = joystick != null ? joystick.Value : Vector2.zero;
            float mag = input.magnitude;
            bool running = joystick != null && joystick.IsRunning;

            float speed = 0f;
            if (mag > 0.05f)
            {
                float targetHeading = Mathf.Atan2(input.x, input.y);
                heading = Mathf.LerpAngle(heading * Mathf.Rad2Deg, targetHeading * Mathf.Rad2Deg,
                                          cfg.turnSpeed * Time.deltaTime) * Mathf.Deg2Rad;
                speed = (running ? cfg.runSpeed : cfg.walkSpeed) * Mathf.Min(mag, 1f);
            }

            Vector3 dir = new Vector3(Mathf.Sin(heading), 0, Mathf.Cos(heading));
            Vector3 move = dir * speed;
            move.y = -9.8f * 0.1f; // gravidade simples para manter no chao
            cc.Move(move * Time.deltaTime);
            transform.rotation = Quaternion.Slerp(transform.rotation,
                Quaternion.Euler(0, heading * Mathf.Rad2Deg, 0), 0.3f);

            if (animator != null)
            {
                animator.SetFloat("Speed", speed);
                animator.SetBool("Running", running);
            }

            UpdateCamera();
        }

        void UpdateCamera()
        {
            if (cameraRig == null) return;
            Vector3 back = new Vector3(-Mathf.Sin(heading), 0, -Mathf.Cos(heading));
            Vector3 target = transform.position + back * camDistance + Vector3.up * camHeight;
            cameraRig.position = Vector3.Lerp(cameraRig.position, target, camLerp);
            cameraRig.LookAt(transform.position + Vector3.up * 1.3f);
        }
    }
}
