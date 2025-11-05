import React, { useRef, useEffect, useState } from "react";
import { View, findNodeHandle, UIManager, StyleSheet } from "react-native";
import {
    Canvas,
    RoundedRect,
    SweepGradient,
    vec,
    useClock,
    Group,
    Rect,
    Mask,
} from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

type ConicGradientRendererProps = {
    borderRadius?: number;
    colors: string[];
    spinRate?: number;
    padding?: number;
    poke?: number;
    enabled: boolean;
    children: React.ReactElement;
};

export const ConicGradientRenderer: React.FC<ConicGradientRendererProps> = ({
    borderRadius = 0,
    colors,
    spinRate = 30,
    padding = 0,
    enabled = true,
    poke = 5,
    children,
}) => {
    const childRef = useRef(null);
    const parentRef = useRef(null);
    const [layout, setLayout] = useState<{ x: number; y: number; width: number; height: number, padWidth: number, padHeight: number } | null>(null);

    const clock = useClock();

    const rotationTransform = useDerivedValue(() => {
        const t = clock.value / 1000;
        const rotationRadians = ((spinRate * t) % 360) * (Math.PI / 180);
        return [{ rotate: rotationRadians }];
    });

    useEffect(() => {
        if (childRef.current && parentRef.current) {
            const childHandle = findNodeHandle(childRef.current);
            const parentHandle = findNodeHandle(parentRef.current);

            if (childHandle && parentHandle) {
                UIManager.measureLayout(
                    childHandle,
                    parentHandle,
                    () => console.warn("measureLayout failed"),
                    (x, y, width, height) => {
                        setLayout({ x, y, width, height, padWidth: width + poke*2, padHeight: height + poke*2 });
                    }
                );
            }
        }
    }, [children]);

    return (
        <View ref={parentRef} style={{ position: "relative" }}>

            {(layout && enabled)  && (
                <View
                    style={{
                        position: "absolute",
                        left: layout.x - poke,
                        top: layout.y - poke,
                        width: layout.width * 2,
                        height: layout.height * 2,
                        pointerEvents: "none",
                    }}
                >
                    <Canvas style={{ width: layout.padWidth, height: layout.padHeight }}>
                        <Mask
                            mask={
                                <RoundedRect
                                    x={padding}
                                    y={padding}
                                    width={layout.padWidth - padding * 2}
                                    height={layout.padHeight - padding * 2}
                                    r={borderRadius}
                                />
                            }
                        >
                            <Group
                                origin={{
                                    x: layout.padWidth / 2,
                                    y: layout.padHeight / 2
                                }}
                                transform={rotationTransform}
                            >
                                <Rect
                                    x={-layout.padWidth * 2}
                                    y={-layout.padWidth * 2}
                                    width={layout.padWidth * 4}
                                    height={layout.padWidth * 4}
                                >
                                    <SweepGradient
                                        c={vec(layout.padWidth / 2, layout.padHeight / 2)}
                                        colors={colors}
                                        start={0}
                                        end={360}
                                    />
                                </Rect>
                            </Group>
                        </Mask>
                    </Canvas>
                </View>
            )}
            {React.isValidElement(children)
                ? React.cloneElement(children as React.ReactElement<any>, { ref: childRef })
                : children}
        </View>
    );
};
