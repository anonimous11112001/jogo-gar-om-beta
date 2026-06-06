using UnityEngine;
using UnityEngine.EventSystems;

namespace WaiterRush
{
    // Joystick virtual (canto inferior esquerdo). Retorna um vetor -1..1 e
    // sinaliza corrida quando empurrado ate a borda.
    public class VirtualJoystick : MonoBehaviour, IDragHandler, IPointerDownHandler, IPointerUpHandler
    {
        public RectTransform background;   // base do joystick
        public RectTransform knob;         // botao movel
        public float radius = 80f;
        public float runThreshold = 0.85f;

        public Vector2 Value { get; private set; }
        public bool IsRunning { get; private set; }

        public void OnPointerDown(PointerEventData e) => OnDrag(e);

        public void OnDrag(PointerEventData e)
        {
            Vector2 pos;
            RectTransformUtility.ScreenPointToLocalPointInRectangle(
                background, e.position, e.pressEventCamera, out pos);
            Vector2 clamped = Vector2.ClampMagnitude(pos, radius);
            knob.anchoredPosition = clamped;
            Value = clamped / radius;
            IsRunning = clamped.magnitude > radius * runThreshold;
        }

        public void OnPointerUp(PointerEventData e)
        {
            knob.anchoredPosition = Vector2.zero;
            Value = Vector2.zero;
            IsRunning = false;
        }
    }
}
